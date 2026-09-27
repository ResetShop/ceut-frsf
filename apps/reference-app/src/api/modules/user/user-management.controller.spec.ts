import { permission } from '@contracts/permission/permission.constants'
import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { CreateUserResponse } from '@contracts/user/user.types'
import { logger } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import type { PaginatedResponse } from '../../interfaces'
import { setAuthenticatedUser } from '../../middlewares/verify-access-token.middleware.mock'
import type { PermissionData, RoleData } from '../access/role/interfaces'
import type {
	CreateUserParams,
	ManagedUserData,
	UpdateUserParams,
	UpdateUserStatusParams,
	UserUpdateResult,
} from './interfaces'
import userManagementController from './user-management.controller'
import { USER_MANAGEMENT_ERRORS } from './user-management.service'
import { USER_ROLE_ERRORS } from './user-role.errors'

describe('User Management Controller', () => {
	// Create mock functions
	const mockGetAllUsers = fn<
		[{ offset?: number; limit?: number } | undefined, string | undefined],
		Promise<PaginatedResponse<ManagedUserData>>
	>()
	const mockGetUser = fn<[number], Promise<ManagedUserData>>()
	const mockCreateUser = fn<[CreateUserParams], Promise<CreateUserResponse>>()
	const mockUpdateUser = fn<[number, UpdateUserParams, number], Promise<UserUpdateResult>>()
	const mockUpdateUserStatus = fn<[number, UpdateUserStatusParams], Promise<UserUpdateResult>>()
	const mockDeleteUser = fn<[number, number], Promise<void>>()
	const mockResetPassword = fn<[number, number], Promise<{ message: string; sendResetEmail: () => Promise<void> }>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()

	let app: Hono

	const testRole: RoleData = {
		id: 1,
		name: 'Admin',
		code: ADMIN_ROLE_CODE,
		description: 'Administrator',
		removable: false,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	}

	const testManagedUser: ManagedUserData = {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		status: UserStatus.ACTIVE,
		statusChangedAt: null,
		statusChangedBy: null,
		deletedAt: null,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
		roles: [testRole],
	}

	// All admin:users:* permissions for the authenticated user
	const allUserPermissions: PermissionData[] = [
		{
			id: 1,
			name: permission('admin:users:read'),
			description: 'Read users',
			module: 'admin',
			resource: 'users',
			action: 'read',
		},
		{
			id: 2,
			name: permission('admin:users:create'),
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
		{
			id: 3,
			name: permission('admin:users:update'),
			description: 'Update users',
			module: 'admin',
			resource: 'users',
			action: 'update',
		},
		{
			id: 4,
			name: permission('admin:users:delete'),
			description: 'Delete users',
			module: 'admin',
			resource: 'users',
			action: 'delete',
		},
		{
			id: 5,
			name: permission('admin:users:disable'),
			description: 'Manage user status',
			module: 'admin',
			resource: 'users',
			action: 'disable',
		},
		{
			id: 6,
			name: permission('admin:users:reset_password'),
			description: 'Reset user passwords',
			module: 'admin',
			resource: 'users',
			action: 'reset_password',
		},
	]

	const ADMIN_USER_ID = 999

	let loggerSecuritySpy: MockFn

	beforeEach(() => {
		clearAllMocks()
		loggerSecuritySpy = spyOn(logger, 'security')

		mockGetUserPermissions.mockResolvedValue(allUserPermissions)

		container.use(
			new InMemoryContainer({
				userManagementService: {
					getAllUsers: mockGetAllUsers,
					getUser: mockGetUser,
					createUser: mockCreateUser,
					updateUser: mockUpdateUser,
					updateUserStatus: mockUpdateUserStatus,
					deleteUser: mockDeleteUser,
					resetPassword: mockResetPassword,
				},
				userRoleService: {
					getUserPermissions: mockGetUserPermissions,
				},
			}),
		)

		app = new Hono()
		app.use('*', async (c, next) => {
			setAuthenticatedUser(c, {
				sub: String(ADMIN_USER_ID),
				email: 'admin@example.com',
				firstName: 'Admin',
				lastName: 'User',
			})
			await next()
		})
		app.route('/users', userManagementController)
	})

	afterEach(() => {
		container.restore()
	})

	describe('GET /users', () => {
		it('should return paginated users', async () => {
			const paginatedResponse: PaginatedResponse<ManagedUserData> = {
				data: [testManagedUser],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetAllUsers.mockResolvedValue(paginatedResponse)

			const res = await app.request('/users')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveLength(1)
			expect(data.total).toBe(1)
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<ManagedUserData> = {
				data: [testManagedUser],
				total: 10,
				offset: 5,
				limit: 5,
			}
			mockGetAllUsers.mockResolvedValue(paginatedResponse)

			const res = await app.request('/users?offset=5&limit=5')

			expect(res.status).toBe(200)
			expect(mockGetAllUsers.calls).toEqual([[{ offset: 5, limit: 5 }, undefined]])
		})

		it('should pass search parameter', async () => {
			const paginatedResponse: PaginatedResponse<ManagedUserData> = {
				data: [testManagedUser],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetAllUsers.mockResolvedValue(paginatedResponse)

			const res = await app.request('/users?search=test')

			expect(res.status).toBe(200)
			expect(mockGetAllUsers.calls).toEqual([[{ offset: undefined, limit: undefined }, 'test']])
		})

		it('should validate offset is non-negative', async () => {
			const res = await app.request('/users?offset=-1')
			expect(res.status).toBe(400)
		})

		it('should validate limit max value', async () => {
			const res = await app.request('/users?limit=501')
			expect(res.status).toBe(400)
		})
	})

	describe('GET /users/:id', () => {
		it('should return user when found', async () => {
			mockGetUser.mockResolvedValue(testManagedUser)

			const res = await app.request('/users/1')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.email).toBe('test@example.com')
			expect(data.roles).toHaveLength(1)
		})

		it('should return 404 when user not found', async () => {
			mockGetUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

			const res = await app.request('/users/999')

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/users/invalid')

			expect(res.status).toBe(400)
		})
	})

	describe('POST /users', () => {
		it('should create a new user', async () => {
			mockCreateUser.mockResolvedValue({ ...testManagedUser, passwordEmailSent: true })

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					roleIds: [1],
				}),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.email).toBe('test@example.com')
			expect(data.passwordEmailSent).toBe(true)
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_created')
		})

		it('should return 409 when email already exists', async () => {
			mockCreateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS))

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				}),
			})

			expect(res.status).toBe(409)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS)
		})

		it('should return 400 when role IDs are invalid', async () => {
			mockCreateUser.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 99999`))

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					roleIds: [99999],
				}),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toContain(USER_ROLE_ERRORS.ROLES_NOT_FOUND)
		})

		it('should validate required fields', async () => {
			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					// missing firstName, lastName
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should accept mustChangePassword in request body', async () => {
			mockCreateUser.mockResolvedValue({ ...testManagedUser, passwordEmailSent: true })

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					mustChangePassword: false,
				}),
			})

			expect(res.status).toBe(201)
			expect(mockCreateUser.calls[0][0]).toMatchObject({ mustChangePassword: false })
		})

		it('should pass mustChangePassword true when explicitly set', async () => {
			mockCreateUser.mockResolvedValue({ ...testManagedUser, passwordEmailSent: true })

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					mustChangePassword: true,
				}),
			})

			expect(res.status).toBe(201)
			expect(mockCreateUser.calls[0][0]).toMatchObject({ mustChangePassword: true })
		})

		it('should default mustChangePassword to true when omitted', async () => {
			mockCreateUser.mockResolvedValue({ ...testManagedUser, passwordEmailSent: true })

			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				}),
			})

			expect(res.status).toBe(201)
			expect(mockCreateUser.calls[0][0]).toMatchObject({ mustChangePassword: true })
		})

		it('should validate email format', async () => {
			const res = await app.request('/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'not-an-email',
					firstName: 'Test',
					lastName: 'User',
				}),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('PATCH /users/:id', () => {
		it('should update user details', async () => {
			const updatedUser = { ...testManagedUser, firstName: 'Updated' }
			mockUpdateUser.mockResolvedValue({ user: updatedUser, previous: testManagedUser })

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Updated' }),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.firstName).toBe('Updated')
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_updated')
		})

		it('should return 404 when user not found', async () => {
			mockUpdateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

			const res = await app.request('/users/999', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Updated' }),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should return 409 when email already exists', async () => {
			mockUpdateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS))

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'taken@example.com' }),
			})

			expect(res.status).toBe(409)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/users/invalid', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Updated' }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 403 and audit when removing your own admin role', async () => {
			mockUpdateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL))

			const res = await app.request(`/users/${ADMIN_USER_ID}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [] }),
			})

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL)
			expect(loggerSecuritySpy.calls.some(([event]) => event === 'self_admin_removal_blocked')).toBe(true)
		})

		it('should apply profile, roles, and status in one service call and audit the status change', async () => {
			mockUpdateUser.mockResolvedValue({
				user: { ...testManagedUser, firstName: 'Updated', status: UserStatus.DISABLED },
				previous: testManagedUser,
			})
			const body = { firstName: 'Updated', roleIds: [1], status: UserStatus.DISABLED }

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			expect(res.status).toBe(200)
			expect(mockUpdateUser.calls).toHaveLength(1)
			expect(mockUpdateUser.calls[0]).toEqual([1, body, ADMIN_USER_ID])
			expect(loggerSecuritySpy.calls[0]).toEqual([
				'user_updated',
				{
					userId: 1,
					changes: {
						email: undefined,
						firstName: 'Updated',
						lastName: undefined,
						roleIds: [1],
						oldStatus: UserStatus.ACTIVE,
						newStatus: UserStatus.DISABLED,
					},
					actorId: ADMIN_USER_ID,
				},
			])
		})

		it('should take the audited previous status from the service result instead of a separate read', async () => {
			mockUpdateUser.mockResolvedValue({
				user: { ...testManagedUser, status: UserStatus.ACTIVE },
				previous: { ...testManagedUser, status: UserStatus.DISABLED },
			})

			await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.ACTIVE }),
			})

			expect(mockGetUser.calls).toHaveLength(0)
			expect(loggerSecuritySpy.calls[0][1]).toMatchObject({
				changes: { oldStatus: UserStatus.DISABLED, newStatus: UserStatus.ACTIVE },
			})
		})

		it('should return 403 for a status change when the actor lacks admin:users:disable', async () => {
			mockGetUserPermissions.mockResolvedValue(
				allUserPermissions.filter((p) => p.name !== permission('admin:users:disable')),
			)

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Updated', status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(403)
			expect(mockUpdateUser.calls).toHaveLength(0)
			expect(loggerSecuritySpy.calls[0]).toEqual([
				'status_change_blocked',
				{ actorId: ADMIN_USER_ID, userId: 1, reason: `Missing ${permission('admin:users:disable')}` },
			])
		})

		it('should allow a profile-only update when the actor lacks admin:users:disable', async () => {
			mockGetUserPermissions.mockResolvedValue(
				allUserPermissions.filter((p) => p.name !== permission('admin:users:disable')),
			)
			mockUpdateUser.mockResolvedValue({ user: testManagedUser, previous: testManagedUser })

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Updated' }),
			})

			expect(res.status).toBe(200)
		})

		it('should return 403 and audit when changing your own status', async () => {
			mockUpdateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT))

			const res = await app.request(`/users/${ADMIN_USER_ID}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(403)
			expect(loggerSecuritySpy.calls.some(([event]) => event === 'self_lockout_blocked')).toBe(true)
		})

		it('should return 422 for an invalid status transition', async () => {
			mockUpdateUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.INVALID_TRANSITION))

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(422)
		})

		it('should return 400 for an invalid status value', async () => {
			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DELETED }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when role IDs are unknown', async () => {
			mockUpdateUser.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 42`))

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [42] }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when a non-removable role would be dropped', async () => {
			mockUpdateUser.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: 1`))

			const res = await app.request('/users/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [] }),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('PATCH /users/:id/status', () => {
		it('should update user status', async () => {
			const disabledUser = { ...testManagedUser, status: UserStatus.DISABLED }
			mockUpdateUserStatus.mockResolvedValue({ user: disabledUser, previous: testManagedUser })

			const res = await app.request('/users/1/status', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.status).toBe(UserStatus.DISABLED)
			expect(mockUpdateUserStatus.calls[0]).toEqual([1, { status: UserStatus.DISABLED, changedBy: ADMIN_USER_ID }])
			expect(loggerSecuritySpy.calls[0]).toEqual([
				'user_status_changed',
				{ userId: 1, oldStatus: UserStatus.ACTIVE, newStatus: UserStatus.DISABLED, actorId: ADMIN_USER_ID },
			])
			// The audited previous status comes from the service result, not a separate read.
			expect(mockGetUser.calls).toHaveLength(0)
		})

		it('should return 403 when trying to change own status', async () => {
			mockUpdateUserStatus.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT))

			const res = await app.request(`/users/${ADMIN_USER_ID}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)
		})

		it('should return 404 when user not found', async () => {
			mockUpdateUserStatus.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

			const res = await app.request('/users/999/status', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should return 422 for invalid state transition', async () => {
			mockUpdateUserStatus.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.INVALID_TRANSITION))

			const res = await app.request('/users/1/status', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.ACTIVE }),
			})

			expect(res.status).toBe(422)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.INVALID_TRANSITION)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/users/invalid/status', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: UserStatus.DISABLED }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 for invalid status value', async () => {
			const res = await app.request('/users/1/status', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'suspended' }),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('DELETE /users/:id', () => {
		it('should soft delete user successfully', async () => {
			mockDeleteUser.mockResolvedValue(undefined)

			const res = await app.request('/users/1', {
				method: 'DELETE',
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('User deleted successfully')
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_deleted')
		})

		it('should return 404 when user not found', async () => {
			mockDeleteUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

			const res = await app.request('/users/999', {
				method: 'DELETE',
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should return 403 when trying to self-delete', async () => {
			mockDeleteUser.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT))

			const res = await app.request(`/users/${ADMIN_USER_ID}`, {
				method: 'DELETE',
			})

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/users/invalid', {
				method: 'DELETE',
			})

			expect(res.status).toBe(400)
		})
	})

	describe('POST /users/:id/reset-password', () => {
		it('should reset the password and emit a security audit log', async () => {
			mockResetPassword.mockResolvedValue({
				message: 'Password reset successfully',
				sendResetEmail: () => Promise.resolve(),
			})

			const res = await app.request('/users/1/reset-password', { method: 'POST' })

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Password reset successfully')
			expect(mockResetPassword.calls).toEqual([[1, ADMIN_USER_ID]])
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_password_reset')
		})

		it('should not expose a generated password in the response and omit the email-delivery flag', async () => {
			mockResetPassword.mockResolvedValue({
				message: 'Password reset successfully',
				sendResetEmail: () => Promise.resolve(),
			})

			const res = await app.request('/users/1/reset-password', { method: 'POST' })
			const data = await res.json()

			expect(data).not.toHaveProperty('password')
			// Email is dispatched best-effort after the response, so no delivery flag is returned.
			expect(Object.keys(data).sort()).toEqual(['message'])
		})

		it('dispatches the reset email after responding (best-effort)', async () => {
			const sendResetEmail = fn<[], Promise<void>>()
			sendResetEmail.mockResolvedValue(undefined)
			mockResetPassword.mockResolvedValue({ message: 'Password reset successfully', sendResetEmail })

			const res = await app.request('/users/1/reset-password', { method: 'POST' })
			// Flush the deferred microtask scheduled by deferAfterResponse.
			await Promise.resolve()

			expect(res.status).toBe(200)
			expect(sendResetEmail.calls).toHaveLength(1)
		})

		it('should return 403 when trying to reset own password', async () => {
			mockResetPassword.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT))

			const res = await app.request(`/users/${ADMIN_USER_ID}/reset-password`, { method: 'POST' })

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)
			expect(loggerSecuritySpy.calls.some(([event]) => event === 'self_lockout_blocked')).toBe(true)
		})

		it('should return 404 when user not found', async () => {
			mockResetPassword.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

			const res = await app.request('/users/999/reset-password', { method: 'POST' })

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/users/invalid/reset-password', { method: 'POST' })

			expect(res.status).toBe(400)
		})
	})
})
