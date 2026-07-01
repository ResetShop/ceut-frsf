import { getInternalErrorMessage, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import { parseDurationToMs } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { createHash } from 'crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SendEmailParams } from '../../services/email/interfaces'
import { createPasswordHasher, createPasswordVerifier } from '../../services/password/password-hasher'
import type { UserData } from '../user/interfaces'
import { InMemoryUserRepository } from '../user/user.repository.mock'
import { InMemoryAuthenticationRepository } from './authentication.repository.mock'
import { InMemoryPasswordResetTokenRepository } from './password-reset-token.repository.mock'
import { PasswordResetService } from './password-reset.service'
import { InMemoryRefreshTokenRepository } from './refresh-token.repository.mock'

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

describe('PasswordResetService', () => {
	let userRepo: InMemoryUserRepository
	let authRepo: InMemoryAuthenticationRepository
	let resetTokenRepo: InMemoryPasswordResetTokenRepository
	let refreshTokenRepo: InMemoryRefreshTokenRepository
	let emailSend: MockFn<[SendEmailParams], Promise<void>>
	let service: PasswordResetService

	const activeUser: UserData = {
		id: 1,
		email: 'user@example.com',
		firstName: 'Test',
		lastName: 'User',
		status: UserStatus.ACTIVE,
	}

	beforeEach(() => {
		clearAllMocks()
		userRepo = new InMemoryUserRepository()
		authRepo = new InMemoryAuthenticationRepository()
		resetTokenRepo = new InMemoryPasswordResetTokenRepository()
		refreshTokenRepo = new InMemoryRefreshTokenRepository()
		emailSend = fn<[SendEmailParams], Promise<void>>()
		emailSend.mockResolvedValue(undefined)

		service = new PasswordResetService({
			userRepository: userRepo,
			authRepository: authRepo,
			passwordResetTokenRepository: resetTokenRepo,
			refreshTokenRepository: refreshTokenRepo,
			emailService: { send: emailSend },
			hashPassword: createPasswordHasher(),
		})
	})

	describe('requestPasswordReset', () => {
		it('creates a token and emails a reset link for an active user', async () => {
			userRepo.addUser(activeUser)

			await service.requestPasswordReset(activeUser.email)

			expect(resetTokenRepo.invalidatedUsers).toContain(activeUser.id)
			expect(resetTokenRepo.createdHashes).toHaveLength(1)
			expect(emailSend.calls).toHaveLength(1)
			const sent = emailSend.calls[0][0]
			expect(sent.to).toBe(activeUser.email)
			expect(sent.html).toContain('/auth/reset-password/confirm?token=')
		})

		it('does nothing for an unknown email (no enumeration)', async () => {
			await service.requestPasswordReset('nobody@example.com')

			expect(resetTokenRepo.createdHashes).toHaveLength(0)
			expect(emailSend.calls).toHaveLength(0)
		})

		it('does nothing for a non-active user', async () => {
			userRepo.addUser({ ...activeUser, status: UserStatus.DISABLED })

			await service.requestPasswordReset(activeUser.email)

			expect(resetTokenRepo.createdHashes).toHaveLength(0)
			expect(emailSend.calls).toHaveLength(0)
		})
	})

	describe('resetPassword', () => {
		const rawToken = 'raw-reset-token-abc'

		beforeEach(() => {
			userRepo.addUser(activeUser)
			authRepo.addAuthRecord(activeUser.id, { passwordHash: 'old-hash' })
		})

		it('sets the new password, consumes the token, and revokes sessions on a valid token', async () => {
			resetTokenRepo.addToken(hashToken(rawToken), {
				userId: activeUser.id,
				expiresAt: new Date(Date.now() + parseDurationToMs('1h')),
				usedAt: null,
			})

			await service.resetPassword(rawToken, 'a-fresh-secure-password')

			expect(authRepo.setPasswordCalls).toHaveLength(1)
			expect(authRepo.setPasswordCalls[0].mustChangePassword).toBe(false)
			await expect(
				createPasswordVerifier()('a-fresh-secure-password', authRepo.setPasswordCalls[0].passwordHash),
			).resolves.toBe(true)
			expect(resetTokenRepo.usedHashes).toContain(hashToken(rawToken))
			expect(refreshTokenRepo.revokedUserIds).toContain(activeUser.id)
		})

		it('throws RESET_TOKEN_INVALID and does not write when the token is expired', async () => {
			resetTokenRepo.addToken(hashToken(rawToken), {
				userId: activeUser.id,
				expiresAt: new Date(Date.now() - parseDurationToMs('1m')),
				usedAt: null,
			})

			await expect(service.resetPassword(rawToken, 'a-fresh-secure-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.RESET_TOKEN_INVALID),
			)
			expect(authRepo.setPasswordCalls).toHaveLength(0)
		})

		it('throws RESET_TOKEN_INVALID when the token was already used', async () => {
			resetTokenRepo.addToken(hashToken(rawToken), {
				userId: activeUser.id,
				expiresAt: new Date(Date.now() + parseDurationToMs('1h')),
				usedAt: new Date(),
			})

			await expect(service.resetPassword(rawToken, 'a-fresh-secure-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.RESET_TOKEN_INVALID),
			)
			expect(authRepo.setPasswordCalls).toHaveLength(0)
		})

		it('throws RESET_TOKEN_INVALID when no token matches', async () => {
			await expect(service.resetPassword('unknown-token', 'a-fresh-secure-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.RESET_TOKEN_INVALID),
			)
			expect(authRepo.setPasswordCalls).toHaveLength(0)
		})

		it('throws RESET_TOKEN_INVALID when the user is no longer active', async () => {
			userRepo.clear()
			userRepo.addUser({ ...activeUser, status: UserStatus.DELETED })
			resetTokenRepo.addToken(hashToken(rawToken), {
				userId: activeUser.id,
				expiresAt: new Date(Date.now() + parseDurationToMs('1h')),
				usedAt: null,
			})

			await expect(service.resetPassword(rawToken, 'a-fresh-secure-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.RESET_TOKEN_INVALID),
			)
			expect(authRepo.setPasswordCalls).toHaveLength(0)
		})
	})
})
