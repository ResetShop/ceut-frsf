import { AuthError, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import { logger, parseDurationToMs } from '@resetshop/util'
import { createHash, randomUUID } from 'crypto'
import { type PasetoService } from '../../services/paseto/interfaces'
import { type UserData, type UserRepository, type UserRoleService } from '../user/interfaces'
import type { AuthConfig } from './auth.config'
import {
	type AuthCredentials,
	type AuthPasswordService,
	type AuthResult,
	type AuthService as AuthServiceInterface,
	type AuthenticationData,
	type AuthenticationRepository,
	type ChangePasswordParams,
	type RefreshResult,
	type RefreshTokenRepository,
} from './interfaces'

interface AuthServiceDeps {
	userRepository: UserRepository
	authRepository: AuthenticationRepository
	refreshTokenRepository: RefreshTokenRepository
	userRoleService: UserRoleService
	pasetoService: PasetoService
	authConfig: AuthConfig
	authPasswordService: AuthPasswordService
}

/**
 * Service for user authentication and token management.
 * Handles login, logout, and token refresh.
 * Uses PASETO tokens for secure, stateless authentication with refresh token rotation.
 */
export class AuthService implements AuthServiceInterface {
	private readonly userRepository: UserRepository
	private readonly authRepository: AuthenticationRepository
	private readonly refreshTokenRepository: RefreshTokenRepository
	private readonly userRoleService: UserRoleService
	private readonly pasetoService: PasetoService
	private readonly authConfig: AuthConfig
	private readonly authPasswordService: AuthPasswordService

	constructor({
		userRepository,
		authRepository,
		refreshTokenRepository,
		userRoleService,
		pasetoService,
		authConfig,
		authPasswordService,
	}: AuthServiceDeps) {
		this.userRepository = userRepository
		this.authRepository = authRepository
		this.refreshTokenRepository = refreshTokenRepository
		this.userRoleService = userRoleService
		this.pasetoService = pasetoService
		this.authConfig = authConfig
		this.authPasswordService = authPasswordService
	}

	/**
	 * Authenticates a user and generates PASETO tokens.
	 * Validates credentials, checks account status and lockout, and creates a new token pair.
	 * Uses timing-safe comparison to prevent email enumeration attacks.
	 * Implements failed login tracking with automatic account lockout.
	 *
	 * @param credentials - Login credentials containing email and password
	 * @returns AuthResult containing user data, access token, and refresh token
	 * @throws AuthError with INVALID_CREDENTIALS code if authentication fails
	 * @throws AuthError with ACCOUNT_LOCKED code if account is locked due to failed attempts
	 */
	public async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
		const { user, authRecord } = await this.findUserAndAuth(credentials.email)
		this.checkAccountLockout(authRecord, user?.id)

		const validated = await this.authPasswordService.validateCredentials(user, authRecord, credentials.password)
		await this.handleSuccessfulLogin(validated.user, validated.authRecord)

		const tokens = await this.generateTokenPair(validated.user)
		// Roles + permissions are returned in the login payload so the frontend
		// can populate `currentUser` fully from one round-trip — without this,
		// permission-guarded UI flickers in the empty-roles window between login
		// and the first `/api/auth/me` call.
		const roles = await this.userRoleService.getUserRolesWithPermissions(validated.user.id)

		return {
			...tokens,
			user: {
				id: validated.user.id,
				email: validated.user.email,
				firstName: validated.user.firstName,
				lastName: validated.user.lastName,
				roles,
			},
			mustChangePassword: validated.authRecord.mustChangePassword,
		}
	}

	/**
	 * Finds user and their authentication record by email.
	 *
	 * SECURITY: Returns nullable values instead of throwing to prevent timing attacks.
	 * If this method threw on user-not-found, attackers could enumerate valid emails
	 * by measuring response times. By always returning (with nulls when not found),
	 * we ensure validateCredentials() always performs password comparison (using a
	 * dummy hash for non-existent users), making all authentication attempts take
	 * similar time regardless of whether the email exists.
	 *
	 * @param email - User's email address
	 * @returns User and auth record, or nulls if not found
	 */
	private async findUserAndAuth(
		email: string,
	): Promise<{ user: UserData | null; authRecord: AuthenticationData | null }> {
		const user = await this.userRepository.findByEmail(email)
		const authRecord = user ? await this.authRepository.findByUserId(user.id) : null
		return { user, authRecord }
	}

	/**
	 * Checks if account is locked due to failed login attempts.
	 *
	 * @param authRecord - User's authentication record
	 * @param userId - User ID for logging
	 * @throws AuthError with ACCOUNT_LOCKED code if account is currently locked
	 */
	private checkAccountLockout(authRecord: AuthenticationData | null, userId?: number): void {
		if (authRecord?.lockedUntil && authRecord.lockedUntil > new Date()) {
			logger.security('login_blocked_account_locked', { userId, lockedUntil: authRecord.lockedUntil.toISOString() })
			throw new AuthError(InternalAuthErrorCode.ACCOUNT_LOCKED, authRecord.lockedUntil)
		}
	}

	/**
	 * Handles successful login by resetting failed attempts and cleaning up expired tokens.
	 *
	 * @param user - Authenticated user
	 * @param authRecord - User's authentication record
	 */
	private async handleSuccessfulLogin(user: UserData, authRecord: AuthenticationData): Promise<void> {
		if (authRecord.failedLoginAttempts > 0) {
			await this.authRepository.resetFailedAttempts(user.id)
		}

		await this.refreshTokenRepository.deleteExpiredTokensForUser(user.id)
	}

	/**
	 * Generates access and refresh token pair for authenticated user.
	 *
	 * @param user - Authenticated user
	 * @returns AuthResult with user data and tokens
	 */
	private async generateTokenPair(user: UserData): Promise<{ token: string; refreshToken: string }> {
		const accessToken = await this.pasetoService.generateAccessToken({
			sub: user.id.toString(),
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		})

		const tokenFamily = randomUUID()
		const refreshToken = await this.pasetoService.generateRefreshToken(user.id.toString(), tokenFamily)

		const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex')
		await this.refreshTokenRepository.create({
			userId: user.id,
			tokenFamily,
			tokenHash: refreshTokenHash,
			expiresAt: new Date(Date.now() + parseDurationToMs(this.authConfig.refreshTokenExpiry)),
		})

		return {
			token: accessToken,
			refreshToken,
		}
	}

	/**
	 * Exchanges a refresh token for a new access/refresh token pair.
	 * Implements token rotation: the old refresh token is revoked and a new one is issued.
	 * Validates token signature, expiration, revocation status, and user account status.
	 *
	 * @param token - The refresh token to exchange
	 * @returns RefreshResult containing new access token and refresh token
	 * @throws AuthError if token is invalid, expired, revoked, or user account is disabled
	 */
	public async refreshToken(token: string): Promise<RefreshResult> {
		// 1. Verify refresh token
		const payload = await this.pasetoService.verifyRefreshToken(token)

		// 2. Validate token family exists (required for rotation tracking)
		if (!payload.tokenFamily) {
			throw new AuthError(InternalAuthErrorCode.TOKEN_MISSING_FAMILY)
		}

		// 3. Find token and user in a single joined query (reduces 2 sequential queries to 1)
		const tokenHash = createHash('sha256').update(token).digest('hex')
		const result = await this.refreshTokenRepository.findByTokenHashWithUser(tokenHash)

		// Treat missing tokens as revoked — covers garbage-collected, never-stored, or deleted token cases
		if (!result) {
			throw new AuthError(InternalAuthErrorCode.TOKEN_REVOKED)
		}

		const { token: storedToken, user } = result

		// 4. Check if token is expired (before reuse detection, so expired+revoked tokens
		// don't trigger family revocation — expiry is the expected lifecycle outcome)
		if (storedToken.expiresAt < new Date()) {
			throw new AuthError(InternalAuthErrorCode.REFRESH_TOKEN_EXPIRED)
		}

		// 5. Token reuse detection: if a non-expired revoked token is replayed, an attacker
		// may have stolen it. Revoke the entire token family to protect the user.
		if (storedToken.isRevoked) {
			logger.security('token_reuse_detected', { userId: storedToken.userId, tokenFamily: storedToken.tokenFamily })
			try {
				await this.refreshTokenRepository.revokeTokenFamily(storedToken.tokenFamily)
			} catch (error) {
				logger.error('TokenReuse', 'Failed to revoke token family', error)
			}
			throw new AuthError(InternalAuthErrorCode.TOKEN_REUSE_DETECTED)
		}

		// 6. Validate account status (user data already fetched via joined query)
		if (user.status === UserStatus.DELETED) {
			throw new AuthError(InternalAuthErrorCode.USER_NOT_FOUND)
		}

		if (user.status !== UserStatus.ACTIVE) {
			throw new AuthError(InternalAuthErrorCode.ACCOUNT_DISABLED)
		}

		// 7. Generate new tokens
		const newAccessToken = await this.pasetoService.generateAccessToken({
			sub: user.id.toString(),
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		})

		const newRefreshToken = await this.pasetoService.generateRefreshToken(
			user.id.toString(),
			payload.tokenFamily, // Maintain token family for rotation
		)

		// 8. Revoke old refresh token
		await this.refreshTokenRepository.revokeToken(storedToken.id)

		// 9. Store new refresh token
		const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex')
		await this.refreshTokenRepository.create({
			userId: user.id,
			tokenFamily: payload.tokenFamily,
			tokenHash: newTokenHash,
			expiresAt: new Date(Date.now() + parseDurationToMs(this.authConfig.refreshTokenExpiry)),
		})

		return {
			token: newAccessToken,
			refreshToken: newRefreshToken,
		}
	}

	/**
	 * Logs out a user by revoking all their refresh tokens.
	 * Also cleans up any expired tokens for the user.
	 *
	 * @param userId - The user's primary key
	 */
	public async logout(userId: number): Promise<void> {
		// Revoke all refresh tokens for this user
		await this.refreshTokenRepository.revokeAllForUser(userId)

		// Delete all expired tokens for this user
		await this.refreshTokenRepository.deleteExpiredTokensForUser(userId)
	}

	/**
	 * Changes an authenticated user's password and revokes their other sessions.
	 * Delegates password verification + the write to AuthPasswordService, then revokes every
	 * refresh token except the caller's current one — all inside a single transaction, so a failed
	 * password check leaves both the password and the existing sessions untouched.
	 *
	 * @param params - userId, current + new passwords, and the caller's current refresh token
	 * @throws AuthError OLD_PASSWORD_MISMATCH when the current password is incorrect
	 */
	public async changePassword({
		userId,
		oldPassword,
		newPassword,
		currentRefreshToken,
	}: ChangePasswordParams): Promise<void> {
		// Hash the cookie the same way stored tokens are (sha256 hex) so the caller's live session is
		// the one preserved; an absent cookie yields a hash matching nothing, revoking every session.
		const exceptTokenHash = currentRefreshToken ? createHash('sha256').update(currentRefreshToken).digest('hex') : ''

		await this.refreshTokenRepository.runInTransaction(async (tx) => {
			await this.authPasswordService.changePassword(userId, oldPassword, newPassword, tx)
			await this.refreshTokenRepository.revokeAllForUserExcept(userId, exceptTokenHash, tx)
		})
	}
}
