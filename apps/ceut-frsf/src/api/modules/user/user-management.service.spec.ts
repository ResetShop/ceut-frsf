import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import { UserStatus } from '@contracts/user/user.constants'
import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import type { EmailService, SendEmailParams } from '../../services/email/interfaces'
import type { RoleData } from '../access/role/interfaces'
import type { AuthenticationRepository } from '../auth/interfaces'
import type {
	ManagedUserData,
	UpdateUserParams,
	UpdateUserStatusParams,
	UserData,
	UserManagementRepository,
	UserRoleRepository,
} from './interfaces'
import { USER_MANAGEMENT_ERRORS, UserManagementService } from './user-management.service'

describe('UserManagementService', () => {
	// Repository mock functions
	const mockFindAll = fn<
		[{ offset?: number; limit?: number } | undefined, string | undefined],
		Promise<{ data: ManagedUserData[]; total: number; offset: number; limit: number }>
	>()
	const mockFindByIdWithRoles = fn<[number], Promise<ManagedUserData | null>>()
	const mockFindByEmail = fn<[string], Promise<UserData | null>>()
	const mockCreate = fn<Parameters<UserManagementRepository['create']>, Promise<ManagedUserData>>()
	const mockUpdate = fn<[number, UpdateUserParams, number], Promise<UserData | null>>()
	const mockUpdateStatus = fn<[number, UpdateUserStatusParams], Promise<ManagedUserData | null>>()
	const mockSoftDelete = fn<[number, number], Promise<boolean>>()

	const mockRepository: UserManagementRepository = {
		findAll: mockFindAll,
		findByIdWithRoles: mockFindByIdWithRoles,
		findByEmail: mockFindByEmail,
		create: mockCreate,
		update: mockUpdate,
		updateStatus: mockUpdateStatus,
		softDelete: mockSoftDelete,
		// Executes the callback inline so the composed repo/auth writes run during the test.
		// REASON: the stub tx is only threaded into mocked methods that ignore it; a real
		// DrizzleTransaction would require a live DB connection, which unit tests must not need.
		runInTransaction: <T>(callback: (tx: DrizzleTransaction) => Promise<T>): Promise<T> =>
			callback(undefined as unknown as DrizzleTransaction),
	}

	// User-role repository mock — createUser composes role assignment through this boundary
	const mockReplaceUserRoles = fn<Parameters<UserRoleRepository['replaceUserRoles']>, Promise<void>>()

	// Typed as the real interface so a new UserRoleRepository method fails compilation until mocked.
	// Only replaceUserRoles is driven by createUser; the rest are unused stubs typed for parity.
	const mockUserRoleRepository: UserRoleRepository = {
		findRolesForUser: fn<
			Parameters<UserRoleRepository['findRolesForUser']>,
			ReturnType<UserRoleRepository['findRolesForUser']>
		>(),
		findRolesWithPermissionsForUser: fn<
			Parameters<UserRoleRepository['findRolesWithPermissionsForUser']>,
			ReturnType<UserRoleRepository['findRolesWithPermissionsForUser']>
		>(),
		findPermissionsForUser: fn<
			Parameters<UserRoleRepository['findPermissionsForUser']>,
			ReturnType<UserRoleRepository['findPermissionsForUser']>
		>(),
		assignRoleToUser: fn<
			Parameters<UserRoleRepository['assignRoleToUser']>,
			ReturnType<UserRoleRepository['assignRoleToUser']>
		>(),
		removeRoleFromUser: fn<
			Parameters<UserRoleRepository['removeRoleFromUser']>,
			ReturnType<UserRoleRepository['removeRoleFromUser']>
		>(),
		findUserHasRole: fn<
			Parameters<UserRoleRepository['findUserHasRole']>,
			ReturnType<UserRoleRepository['findUserHasRole']>
		>(),
		replaceUserRoles: mockReplaceUserRoles,
	}

	// Auth repository mock — user-management composes its password writes through this boundary
	const mockCreateInitialPassword = fn<Parameters<AuthenticationRepository['createInitialPassword']>, Promise<void>>()
	const mockSetPassword = fn<Parameters<AuthenticationRepository['setPassword']>, Promise<boolean>>()

	// Annotated as the real interface so a new AuthenticationRepository method fails compilation
	// here until it is mocked. The lockout/lookup stubs are unused by these tests but typed for
	// parity; createInitialPassword/setPassword are the methods the service actually drives.
	const mockAuthRepository: AuthenticationRepository = {
		findByUserId: fn<
			Parameters<AuthenticationRepository['findByUserId']>,
			ReturnType<AuthenticationRepository['findByUserId']>
		>(),
		incrementFailedAttempts: fn<
			Parameters<AuthenticationRepository['incrementFailedAttempts']>,
			ReturnType<AuthenticationRepository['incrementFailedAttempts']>
		>(),
		lockAccount: fn<
			Parameters<AuthenticationRepository['lockAccount']>,
			ReturnType<AuthenticationRepository['lockAccount']>
		>(),
		resetFailedAttempts: fn<
			Parameters<AuthenticationRepository['resetFailedAttempts']>,
			ReturnType<AuthenticationRepository['resetFailedAttempts']>
		>(),
		incrementAndLockIfNeeded: fn<
			Parameters<AuthenticationRepository['incrementAndLockIfNeeded']>,
			ReturnType<AuthenticationRepository['incrementAndLockIfNeeded']>
		>(),
		createInitialPassword: mockCreateInitialPassword,
		setPassword: mockSetPassword,
	}

	// Email mock
	const mockSend = fn<[SendEmailParams], Promise<void>>()
	const mockEmailService: EmailService = { send: mockSend }

	// Password generator mock
	const mockGeneratePassword = fn<[], Promise<string>>()

	// Password hasher mock — deterministic so tests need no real bcrypt / BCRYPT_COST
	const mockHashPassword = fn<[string], Promise<string>>()

	// Suppress console.error in tests that trigger non-blocking email failures
	let consoleErrorSpy: MockFn

	let service: UserManagementService

	const testRole: RoleData = {
		id: 1,
		name: 'Admin',
		code: ADMIN_ROLE_CODE,
		description: 'Administrator',
		removable: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const testUser: UserData = {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		status: UserStatus.ACTIVE,
	}

	const testManagedUser: ManagedUserData = {
		...testUser,
		statusChangedAt: null,
		statusChangedBy: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		roles: [testRole],
	}

	beforeEach(() => {
		clearAllMocks()
		consoleErrorSpy = spyOn(console, 'error')

		mockGeneratePassword.mockResolvedValue('indigo.rabbit.troop')
		mockHashPassword.mockResolvedValue('hashed-password')
		mockSend.mockResolvedValue(undefined)

		service = new UserManagementService({
			userManagementRepository: mockRepository,
			userRoleRepository: mockUserRoleRepository,
			authRepository: mockAuthRepository,
			emailService: mockEmailService,
			generatePassword: mockGeneratePassword,
			hashPassword: mockHashPassword,
		})
	})

	describe('getAllUsers', () => {
		it('should return paginated users', async () => {
			const paginatedResponse = {
				data: [testManagedUser],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockFindAll.mockResolvedValue(paginatedResponse)

			const result = await service.getAllUsers()

			expect(result).toEqual(paginatedResponse)
			expect(mockFindAll.calls).toEqual([[undefined, undefined]])
		})

		it('should pass pagination and search parameters', async () => {
			const paginatedResponse = {
				data: [testManagedUser],
				total: 1,
				offset: 5,
				limit: 5,
			}
			mockFindAll.mockResolvedValue(paginatedResponse)

			const result = await service.getAllUsers({ offset: 5, limit: 5 }, 'test')

			expect(result.offset).toBe(5)
			expect(result.limit).toBe(5)
			expect(mockFindAll.calls).toEqual([[{ offset: 5, limit: 5 }, 'test']])
		})
	})

	describe('getUser', () => {
		it('should return user with roles', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)

			const result = await service.getUser(1)

			expect(result).toEqual(testManagedUser)
			expect(mockFindByIdWithRoles.calls).toEqual([[1]])
		})

		it('should throw NOT_FOUND when user does not exist', async () => {
			mockFindByIdWithRoles.mockResolvedValue(null)

			await expect(service.getUser(999)).rejects.toThrow(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})
	})

	describe('createUser', () => {
		it('should create a user, assign roles in the same transaction, and send welcome email', async () => {
			mockFindByEmail.mockResolvedValue(null)
			// Identity insert returns no roles; the post-commit re-read reflects the assignments.
			mockCreate.mockResolvedValue({ ...testManagedUser, roles: [] })
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)

			const { passwordEmailSent, ...user } = await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					roleIds: [1],
				},
				999,
			)

			expect(user).toEqual(testManagedUser)
			expect(passwordEmailSent).toBe(true)
			expect(mockFindByEmail.calls).toEqual([['test@example.com']])
			expect(mockCreate.calls).toHaveLength(1)
			// create() receives identity only — no roleIds (authorization) and no actorId
			expect(mockCreate.calls[0][0]).toEqual({ email: 'test@example.com', firstName: 'Test', lastName: 'User' })
			// Role assignment is composed through the user-role context inside the same transaction
			expect(mockReplaceUserRoles.calls).toHaveLength(1)
			expect(mockReplaceUserRoles.calls[0][0]).toBe(testManagedUser.id)
			expect(mockReplaceUserRoles.calls[0][1]).toEqual([1])
			expect(mockReplaceUserRoles.calls[0][2]).toBe(999)
			// Response reflects the assigned roles via the post-commit re-read
			expect(mockFindByIdWithRoles.calls).toEqual([[testManagedUser.id]])
			// The auth row is written through the auth domain inside the same transaction
			expect(mockCreateInitialPassword.calls).toHaveLength(1)
			expect(mockCreateInitialPassword.calls[0][0]).toMatchObject({ userId: testManagedUser.id })
		})

		it('should create a user without touching the user-role context when roleIds is omitted', async () => {
			const userWithNoRoles = { ...testManagedUser, roles: [] }
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(userWithNoRoles)

			const result = await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(result.roles).toEqual([])
			expect(mockCreate.calls[0][0]).toEqual({ email: 'test@example.com', firstName: 'Test', lastName: 'User' })
			// No roles requested → no authorization write and no re-read
			expect(mockReplaceUserRoles.calls).toHaveLength(0)
			expect(mockFindByIdWithRoles.calls).toHaveLength(0)
		})

		it('should throw EMAIL_EXISTS when email is taken', async () => {
			mockFindByEmail.mockResolvedValue(testUser)

			await expect(
				service.createUser(
					{
						email: 'test@example.com',
						firstName: 'Test',
						lastName: 'User',
					},
					999,
				),
			).rejects.toThrow(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS)
		})

		it('should auto-generate a password and hash it', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(mockGeneratePassword.calls).toHaveLength(1)
			expect(mockHashPassword.calls).toEqual([['indigo.rabbit.troop']])
			expect(mockCreateInitialPassword.calls[0][0].passwordHash).toBe('hashed-password')
		})

		it('should default mustChangePassword to true when not provided', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(mockCreateInitialPassword.calls[0][0]).toMatchObject({ mustChangePassword: true })
		})

		it('should pass mustChangePassword false when explicitly set', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					mustChangePassword: false,
				},
				999,
			)

			expect(mockCreateInitialPassword.calls[0][0]).toMatchObject({ mustChangePassword: false })
		})

		it('should pass mustChangePassword to welcome email builder', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					mustChangePassword: false,
				},
				999,
			)

			const sentEmail = mockSend.calls[0][0]
			expect(sentEmail.text).not.toContain('change your password')
			expect(sentEmail.html).not.toContain('change your password')
			expect(sentEmail.html).not.toContain('#fff3cd')
		})

		it('should send welcome email with generated password', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(mockSend.calls).toHaveLength(1)
			const sentEmail = mockSend.calls[0][0]
			expect(sentEmail.to).toBe('test@example.com')
			expect(sentEmail.subject).toEqual(expect.any(String))
			expect(sentEmail.text).toContain('indigo.rabbit.troop')
			expect(sentEmail.html).toContain('indigo.rabbit.troop')
		})

		it('should return passwordEmailSent true when email succeeds', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)

			const result = await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(result.passwordEmailSent).toBe(true)
		})

		it('should return passwordEmailSent false when email fails', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)
			mockSend.mockRejectedValue(new Error('SMTP connection refused'))

			const result = await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(result.passwordEmailSent).toBe(false)
			expect(consoleErrorSpy.calls).toHaveLength(1)
			expect(consoleErrorSpy.calls[0][0]).toContain('[UserManagementService]')
		})

		it('should still create user when email sending fails', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)
			mockSend.mockRejectedValue(new Error('SMTP connection refused'))

			const { passwordEmailSent, ...user } = await service.createUser(
				{
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				},
				999,
			)

			expect(mockCreate.calls).toHaveLength(1)
			expect(user).toEqual(testManagedUser)
			expect(passwordEmailSent).toBe(false)
		})

		it('should propagate an error when the initial-password write fails and skip the welcome email', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue(testManagedUser)
			mockCreateInitialPassword.mockRejectedValue(new Error('auth insert failed'))

			await expect(
				service.createUser({ email: 'test@example.com', firstName: 'Test', lastName: 'User' }, 999),
			).rejects.toThrow('auth insert failed')
			// The welcome email is sent only after the transaction commits, so a failed
			// auth-row write must abort createUser before any email is dispatched.
			expect(mockSend.calls).toHaveLength(0)
		})

		it('should propagate an error when role assignment fails and skip the welcome email', async () => {
			mockFindByEmail.mockResolvedValue(null)
			mockCreate.mockResolvedValue({ ...testManagedUser, roles: [] })
			// clearAllMocks resets call records, not implementations — explicitly let the auth-row
			// write succeed so the failure isolates to replaceUserRoles.
			mockCreateInitialPassword.mockResolvedValue(undefined)
			mockReplaceUserRoles.mockRejectedValue(new Error('Roles not found: 9'))

			await expect(
				service.createUser({ email: 'test@example.com', firstName: 'Test', lastName: 'User', roleIds: [9] }, 999),
			).rejects.toThrow('Roles not found')
			// Role assignment runs inside the same transaction; its failure rolls back the user and
			// auth-row inserts and aborts createUser before any welcome email is dispatched.
			expect(mockSend.calls).toHaveLength(0)
		})
	})

	describe('updateUser', () => {
		it('should update user details', async () => {
			const updatedUser = { ...testManagedUser, firstName: 'Updated' }
			mockFindByIdWithRoles.mockResolvedValueOnce(testManagedUser).mockResolvedValueOnce(updatedUser)
			mockUpdate.mockResolvedValue({ ...testUser, firstName: 'Updated' })

			const result = await service.updateUser(1, { firstName: 'Updated' }, 999)

			expect(result.firstName).toBe('Updated')
		})

		it('should throw NOT_FOUND when user does not exist', async () => {
			mockFindByIdWithRoles.mockResolvedValue(null)

			await expect(service.updateUser(999, { firstName: 'Updated' }, 999)).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.NOT_FOUND,
			)
		})

		it('should throw EMAIL_EXISTS when changing to taken email', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockFindByEmail.mockResolvedValue({ ...testUser, id: 2, email: 'taken@example.com' })

			await expect(service.updateUser(1, { email: 'taken@example.com' }, 999)).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.EMAIL_EXISTS,
			)
		})

		it('should replace roles via the user-role context when roleIds is provided (no profile write)', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockReplaceUserRoles.mockResolvedValue(undefined)

			await service.updateUser(1, { roleIds: [1, 2] }, 999)

			expect(mockReplaceUserRoles.calls).toEqual([[1, [1, 2], 999]])
			// Roles-only edit must not write the user profile (no spurious profile-history entry).
			expect(mockUpdate.calls).toHaveLength(0)
		})

		it('should throw SELF_ADMIN_REMOVAL when an admin removes their own admin role', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)

			// id === actorId (self) and the new role set excludes the admin role (id 1).
			await expect(service.updateUser(1, { roleIds: [2] }, 1)).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL,
			)
			expect(mockReplaceUserRoles.calls).toHaveLength(0)
		})

		it('should allow an admin to keep their own admin role when editing self', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockReplaceUserRoles.mockResolvedValue(undefined)

			await service.updateUser(1, { roleIds: [1, 3] }, 1)

			expect(mockReplaceUserRoles.calls).toEqual([[1, [1, 3], 1]])
		})

		it('should not guard role changes when updating a different user', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockReplaceUserRoles.mockResolvedValue(undefined)

			// Removing the admin role from someone else (actor 999 != target 1) is allowed.
			await service.updateUser(1, { roleIds: [] }, 999)

			expect(mockReplaceUserRoles.calls).toEqual([[1, [], 999]])
		})
	})

	describe('deleteUser', () => {
		it('should soft delete a user', async () => {
			mockSoftDelete.mockResolvedValue(true)

			await service.deleteUser(1, 999)

			expect(mockSoftDelete.calls).toEqual([[1, 999]])
		})

		it('should throw NOT_FOUND when user does not exist', async () => {
			mockSoftDelete.mockResolvedValue(false)

			await expect(service.deleteUser(999, 1)).rejects.toThrow(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should throw SELF_LOCKOUT when deleting own account', async () => {
			await expect(service.deleteUser(1, 1)).rejects.toThrow(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)
		})
	})

	describe('updateUserStatus', () => {
		it('should update status from active to disabled', async () => {
			const disabledUser = { ...testManagedUser, status: UserStatus.DISABLED }
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockUpdateStatus.mockResolvedValue(disabledUser)

			const result = await service.updateUserStatus(1, { status: UserStatus.DISABLED, changedBy: 999 })

			expect(result.status).toBe(UserStatus.DISABLED)
		})

		it('should update status from disabled to active', async () => {
			const disabledUser = { ...testManagedUser, status: UserStatus.DISABLED }
			const reactivatedUser = { ...testManagedUser, status: UserStatus.ACTIVE }
			mockFindByIdWithRoles.mockResolvedValue(disabledUser)
			mockUpdateStatus.mockResolvedValue(reactivatedUser)

			const result = await service.updateUserStatus(1, { status: UserStatus.ACTIVE, changedBy: 999 })

			expect(result.status).toBe(UserStatus.ACTIVE)
		})

		it('should throw SELF_LOCKOUT when changing own status', async () => {
			await expect(service.updateUserStatus(1, { status: UserStatus.DISABLED, changedBy: 1 })).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.SELF_LOCKOUT,
			)
		})

		it('should throw NOT_FOUND when user does not exist', async () => {
			mockFindByIdWithRoles.mockResolvedValue(null)

			await expect(service.updateUserStatus(999, { status: UserStatus.DISABLED, changedBy: 1 })).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.NOT_FOUND,
			)
		})

		it('should throw INVALID_TRANSITION for same-status transition', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)

			await expect(service.updateUserStatus(1, { status: UserStatus.ACTIVE, changedBy: 999 })).rejects.toThrow(
				USER_MANAGEMENT_ERRORS.INVALID_TRANSITION,
			)
		})
	})

	describe('resetPassword', () => {
		it('should generate, hash, persist a new password and return a deferred email sender', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockSetPassword.mockResolvedValue(true)

			const result = await service.resetPassword(1, 999)

			expect(result.message).toBe('Password reset successfully')
			expect(mockGeneratePassword.calls).toHaveLength(1)
			expect(mockSetPassword.calls).toHaveLength(1)
			// Email is NOT sent during the reset — it is deferred to the returned thunk.
			expect(mockSend.calls).toHaveLength(0)

			await result.sendResetEmail()
			expect(mockSend.calls).toHaveLength(1)
		})

		it('should persist the hashed password, not the plaintext', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockSetPassword.mockResolvedValue(true)

			await service.resetPassword(1, 999)

			expect(mockHashPassword.calls).toEqual([['indigo.rabbit.troop']])
			const [, persistedHash] = mockSetPassword.calls[0]
			expect(persistedHash).toBe('hashed-password')
		})

		it('should always set mustChangePassword to true', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockSetPassword.mockResolvedValue(true)

			await service.resetPassword(1, 999)

			expect(mockSetPassword.calls[0][2]).toBe(true)
		})

		it('should throw SELF_LOCKOUT when resetting own password', async () => {
			await expect(service.resetPassword(1, 1)).rejects.toThrow(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)
			expect(mockFindByIdWithRoles.calls).toHaveLength(0)
			expect(mockSetPassword.calls).toHaveLength(0)
			expect(mockSend.calls).toHaveLength(0)
		})

		it('should throw NOT_FOUND when the user does not exist', async () => {
			mockFindByIdWithRoles.mockResolvedValue(null)

			await expect(service.resetPassword(999, 1)).rejects.toThrow(USER_MANAGEMENT_ERRORS.NOT_FOUND)
			expect(mockSetPassword.calls).toHaveLength(0)
		})

		it('does not block the reset on email delivery; the deferred sender rejects on SMTP failure', async () => {
			mockFindByIdWithRoles.mockResolvedValue(testManagedUser)
			mockSetPassword.mockResolvedValue(true)
			mockSend.mockRejectedValue(new Error('SMTP down'))

			// The reset itself succeeds regardless of email — the thunk is not invoked here.
			const result = await service.resetPassword(1, 999)
			expect(result.message).toBe('Password reset successfully')
			expect(mockSetPassword.calls).toHaveLength(1)

			// Invoking the deferred sender surfaces the failure to the caller (the controller's onError logs it).
			await expect(result.sendResetEmail()).rejects.toThrow('SMTP down')
		})
	})
})
