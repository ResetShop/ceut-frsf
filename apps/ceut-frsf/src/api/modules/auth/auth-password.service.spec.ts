import { getInternalErrorMessage, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPasswordHasher, createPasswordVerifier } from '../../services/password/password-hasher'
import type { UserData } from '../user/interfaces'
import { AuthPasswordService } from './auth-password.service'
import { InMemoryAuthenticationRepository } from './authentication.repository.mock'
import type { AuthenticationData } from './interfaces'

describe('AuthPasswordService', () => {
	let mockAuthRepo: InMemoryAuthenticationRepository
	let service: AuthPasswordService

	const testPassword = 'password123'
	let testPasswordHash: string

	const testUser: UserData = {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		status: UserStatus.ACTIVE,
	}

	const buildAuthRecord = (overrides: Partial<AuthenticationData> = {}): AuthenticationData => ({
		id: 1,
		userId: testUser.id,
		passwordHash: testPasswordHash,
		failedLoginAttempts: 0,
		lockedUntil: null,
		mustChangePassword: false,
		...overrides,
	})

	beforeAll(async () => {
		testPasswordHash = await createPasswordHasher()(testPassword)
	})

	beforeEach(() => {
		clearAllMocks()
		mockAuthRepo = new InMemoryAuthenticationRepository()
		service = new AuthPasswordService({
			authRepository: mockAuthRepo,
			verifyPassword: createPasswordVerifier(),
			hashPassword: createPasswordHasher(),
		})
	})

	afterEach(() => {
		mockAuthRepo.clear()
	})

	describe('validateCredentials', () => {
		it('returns the user and auth record on valid credentials', async () => {
			const authRecord = buildAuthRecord()

			const result = await service.validateCredentials(testUser, authRecord, testPassword)

			expect(result).toEqual({ user: testUser, authRecord })
		})

		it('throws INVALID_CREDENTIALS and increments failed attempts on a wrong password', async () => {
			await expect(service.validateCredentials(testUser, buildAuthRecord(), 'wrong-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS),
			)
			expect(mockAuthRepo.incrementedUsers).toContain(testUser.id)
		})

		it('throws INVALID_CREDENTIALS without incrementing when the user is not found (timing-safe)', async () => {
			await expect(service.validateCredentials(null, null, testPassword)).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS),
			)
			expect(mockAuthRepo.incrementedUsers).toHaveLength(0)
		})

		it('throws INVALID_CREDENTIALS without incrementing when the auth record is missing', async () => {
			await expect(service.validateCredentials(testUser, null, testPassword)).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS),
			)
			expect(mockAuthRepo.incrementedUsers).toHaveLength(0)
		})

		it('still runs a bcrypt comparison against a valid hash when the account is unknown (timing-safety)', async () => {
			const verifySpy = fn<[string, string], Promise<boolean>>().mockResolvedValue(false)
			const timingSafeService = new AuthPasswordService({
				authRepository: mockAuthRepo,
				verifyPassword: verifySpy,
				hashPassword: createPasswordHasher(),
			})

			await expect(timingSafeService.validateCredentials(null, null, 'any-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS),
			)

			// The compare MUST run even with no account, against a *genuine* bcrypt hash — a malformed
			// or empty hash lets bcryptjs short-circuit, reopening the email-enumeration timing oracle.
			expect(verifySpy.calls).toHaveLength(1)
			const [, hashArgument] = verifySpy.calls[0]
			expect(hashArgument).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/)
		})

		it('throws INVALID_CREDENTIALS for a disabled user even with the correct password', async () => {
			await expect(
				service.validateCredentials({ ...testUser, status: UserStatus.DISABLED }, buildAuthRecord(), testPassword),
			).rejects.toThrow(getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS))
		})

		it('throws INVALID_CREDENTIALS for a deleted user even with the correct password', async () => {
			await expect(
				service.validateCredentials({ ...testUser, status: UserStatus.DELETED }, buildAuthRecord(), testPassword),
			).rejects.toThrow(getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS))
		})

		it('locks the account when failed attempts reach the configured threshold', async () => {
			// maxFailedAttempts: 1 → a single wrong password trips the lockout branch
			const lockingAuthRepo = new InMemoryAuthenticationRepository({ maxFailedAttempts: 1 })
			lockingAuthRepo.addAuthRecord(testUser.id, { passwordHash: testPasswordHash })
			const lockingService = new AuthPasswordService({
				authRepository: lockingAuthRepo,
				verifyPassword: createPasswordVerifier(),
				hashPassword: createPasswordHasher(),
			})

			await expect(lockingService.validateCredentials(testUser, buildAuthRecord(), 'wrong-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS),
			)
			expect(lockingAuthRepo.lockedUsers).toHaveLength(1)
		})
	})

	describe('changePassword', () => {
		it('hashes and stores the new password and clears the must-change flag', async () => {
			mockAuthRepo.addAuthRecord(testUser.id, { passwordHash: testPasswordHash, mustChangePassword: true })
			const newPassword = 'a-brand-new-password'

			await service.changePassword(testUser.id, testPassword, newPassword)

			expect(mockAuthRepo.setPasswordCalls).toHaveLength(1)
			const [call] = mockAuthRepo.setPasswordCalls
			expect(call.userId).toBe(testUser.id)
			expect(call.mustChangePassword).toBe(false)
			// The stored hash must verify against the NEW password — proof it was hashed, not stored raw.
			await expect(createPasswordVerifier()(newPassword, call.passwordHash)).resolves.toBe(true)
		})

		it('throws OLD_PASSWORD_MISMATCH and does not write when the current password is wrong', async () => {
			mockAuthRepo.addAuthRecord(testUser.id, { passwordHash: testPasswordHash })

			await expect(
				service.changePassword(testUser.id, 'wrong-current-password', 'a-brand-new-password'),
			).rejects.toThrow(getInternalErrorMessage(InternalAuthErrorCode.OLD_PASSWORD_MISMATCH))
			expect(mockAuthRepo.setPasswordCalls).toHaveLength(0)
		})

		it('throws AUTH_RECORD_NOT_FOUND when the user has no authentication record', async () => {
			await expect(service.changePassword(999, testPassword, 'a-brand-new-password')).rejects.toThrow(
				getInternalErrorMessage(InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND),
			)
			expect(mockAuthRepo.setPasswordCalls).toHaveLength(0)
		})
	})

	describe('getMustChangePassword', () => {
		it('returns true when the auth record requires a password change', async () => {
			mockAuthRepo.addAuthRecord(testUser.id, { passwordHash: testPasswordHash, mustChangePassword: true })
			await expect(service.getMustChangePassword(testUser.id)).resolves.toBe(true)
		})

		it('returns false when the auth record does not require a change', async () => {
			mockAuthRepo.addAuthRecord(testUser.id, { passwordHash: testPasswordHash })
			await expect(service.getMustChangePassword(testUser.id)).resolves.toBe(false)
		})

		it('returns false when the user has no authentication record', async () => {
			await expect(service.getMustChangePassword(999)).resolves.toBe(false)
		})
	})
})
