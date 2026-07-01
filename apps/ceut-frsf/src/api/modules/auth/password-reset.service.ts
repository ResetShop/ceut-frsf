import { AuthError, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import { logger, parseDurationToMs } from '@resetshop/util'
import { createHash, randomBytes } from 'crypto'
import { httpEnv } from '../../config/http.env'
import { PASSWORD_RESET_PATH, PASSWORD_RESET_TOKEN_EXPIRY } from '../../constants/auth.constants'
import { buildForgotPasswordEmail } from '../../services/email/forgot-password-email.builder'
import { type EmailService } from '../../services/email/interfaces'
import { type UserRepository } from '../user/interfaces'
import {
	type AuthenticationRepository,
	type PasswordResetService as IPasswordResetService,
	type PasswordResetTokenRepository,
	type RefreshTokenRepository,
} from './interfaces'

interface PasswordResetServiceDeps {
	userRepository: UserRepository
	authRepository: AuthenticationRepository
	passwordResetTokenRepository: PasswordResetTokenRepository
	refreshTokenRepository: RefreshTokenRepository
	emailService: EmailService
	hashPassword: (plain: string) => Promise<string>
}

/**
 * Owns the unauthenticated self-service password-reset flow: issuing single-use, time-limited reset
 * tokens by email and consuming them to set a new password. Kept separate from AuthService (which
 * orchestrates authenticated flows) — keeping unauthenticated self-service flows apart from
 * authenticated session management is a deliberate single-responsibility boundary.
 */
export class PasswordResetService implements IPasswordResetService {
	private readonly userRepository: UserRepository
	private readonly authRepository: AuthenticationRepository
	private readonly passwordResetTokenRepository: PasswordResetTokenRepository
	private readonly refreshTokenRepository: RefreshTokenRepository
	private readonly emailService: EmailService
	private readonly hashPassword: (plain: string) => Promise<string>

	constructor({
		userRepository,
		authRepository,
		passwordResetTokenRepository,
		refreshTokenRepository,
		emailService,
		hashPassword,
	}: PasswordResetServiceDeps) {
		this.userRepository = userRepository
		this.authRepository = authRepository
		this.passwordResetTokenRepository = passwordResetTokenRepository
		this.refreshTokenRepository = refreshTokenRepository
		this.emailService = emailService
		this.hashPassword = hashPassword
	}

	/**
	 * Initiates a reset for the given email.
	 *
	 * SECURITY: resolves silently for unknown/inactive accounts so the caller's observable behaviour
	 * is identical regardless of whether the email belongs to an active user (no enumeration). Only
	 * active users have a token created and an email sent.
	 */
	public async requestPasswordReset(email: string): Promise<void> {
		const user = await this.userRepository.findByEmail(email)
		if (!user || user.status !== UserStatus.ACTIVE) {
			return
		}

		// Only the latest link should be valid — drop any outstanding unused tokens first.
		await this.passwordResetTokenRepository.invalidateAllForUser(user.id)

		const rawToken = randomBytes(32).toString('base64url')
		await this.passwordResetTokenRepository.create({
			userId: user.id,
			tokenHash: this.hashToken(rawToken),
			expiresAt: new Date(Date.now() + parseDurationToMs(PASSWORD_RESET_TOKEN_EXPIRY)),
		})

		const emailContent = buildForgotPasswordEmail({
			firstName: user.firstName,
			resetUrl: this.buildResetUrl(rawToken),
		})
		await this.emailService.send({ to: user.email, ...emailContent })
	}

	/**
	 * Completes a reset: validates the token (exists, unexpired, unused) and the user (still active),
	 * then atomically sets the new password + consumes the token and revokes all of the user's sessions.
	 *
	 * @throws AuthError RESET_TOKEN_INVALID for any missing/expired/used token or inactive user
	 */
	public async resetPassword(token: string, newPassword: string): Promise<void> {
		const tokenHash = this.hashToken(token)
		const record = await this.passwordResetTokenRepository.findByTokenHash(tokenHash)
		if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
			throw new AuthError(InternalAuthErrorCode.RESET_TOKEN_INVALID)
		}

		const user = await this.userRepository.findById(record.userId)
		if (!user || user.status !== UserStatus.ACTIVE) {
			throw new AuthError(InternalAuthErrorCode.RESET_TOKEN_INVALID)
		}

		const newPasswordHash = await this.hashPassword(newPassword)
		await this.passwordResetTokenRepository.runInTransaction(async (tx) => {
			await this.authRepository.setPassword(record.userId, newPasswordHash, false, tx)
			await this.passwordResetTokenRepository.markUsed(tokenHash, tx)
		})

		await this.refreshTokenRepository.revokeAllForUser(record.userId)
		logger.security('password_reset_completed', { userId: record.userId })
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex')
	}

	private buildResetUrl(rawToken: string): string {
		// httpEnv.CORS_ORIGIN is the configured frontend origin (defaults to the dev server in the schema).
		// Take the first origin if a comma-separated list is configured, and strip any trailing slash.
		const origin = httpEnv.CORS_ORIGIN.split(',')[0].trim().replace(/\/$/, '')
		return `${origin}${PASSWORD_RESET_PATH}?token=${encodeURIComponent(rawToken)}`
	}
}
