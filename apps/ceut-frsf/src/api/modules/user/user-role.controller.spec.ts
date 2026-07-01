import { permission } from '@contracts/permission/permission.constants'
import { logger } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import type { PaginatedResponse } from '../../interfaces'
import type { AuthenticatedContext } from '../../middlewares/verify-access-token.middleware'
import type { PermissionData, RoleData, RoleWithPermissions } from '../access/role/interfaces'
import userRoleController from './user-role.controller'
import { USER_ROLE_ERRORS } from './user-role.errors'

describe('User Role Controller', () => {
	// Create mock functions
	const mockGetUserRoles = fn<[number, { offset?: number; limit?: number }?], Promise<PaginatedResponse<RoleData>>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()
	const mockAssignRoleToUser = fn<[number, number], Promise<void>>()
	const mockRemoveRoleFromUser = fn<[number, number], Promise<void>>()
	const mockGetUserRolesWithPermissions = fn<[number], Promise<RoleWithPermissions[]>>()
	const mockReplaceUserRoles = fn<[number, number[]], Promise<void>>()

	// Create app with auth middleware that simulates authenticated user
	let app: Hono

	// Test data
	const testRole: RoleData = {
		id: 1,
		name: 'Admin',
		code: 'admin',
		description: 'Administrator',
		removable: false,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	}

	const testPermissions: PermissionData[] = [
		{
			id: 1,
			name: 'can_create_users',
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
	]

	// All admin:user_roles:* permissions for testing (for authenticated user ID 999)
	const allUserRolePermissions: PermissionData[] = [
		{
			id: 1,
			name: permission('admin:user_roles:read'),
			description: 'Read user roles',
			module: 'admin',
			resource: 'user_roles',
			action: 'read',
		},
		{
			id: 2,
			name: permission('admin:user_roles:assign'),
			description: 'Assign roles',
			module: 'admin',
			resource: 'user_roles',
			action: 'assign',
		},
		{
			id: 3,
			name: permission('admin:user_roles:remove'),
			description: 'Remove roles',
			module: 'admin',
			resource: 'user_roles',
			action: 'remove',
		},
	]

	// The authenticated admin user ID
	const ADMIN_USER_ID = 999

	let loggerSecuritySpy: MockFn

	beforeEach(() => {
		clearAllMocks()
		loggerSecuritySpy = spyOn(logger, 'security')

		// Mock getUserPermissions to return different results based on user ID:
		// - For the authenticated admin user (ID 999): return all user_role permissions
		// - For other users: return the test permissions or error as needed
		mockGetUserPermissions.mockImplementation((userId: number) => {
			if (userId === ADMIN_USER_ID) {
				// This is the permission check for the authenticated user
				return Promise.resolve(allUserRolePermissions)
			}
			// This is the actual endpoint call for the target user
			return Promise.resolve(testPermissions)
		})

		container.use(
			new InMemoryContainer({
				userRoleService: {
					getUserRoles: mockGetUserRoles,
					getUserPermissions: mockGetUserPermissions,
					assignRoleToUser: mockAssignRoleToUser,
					removeRoleFromUser: mockRemoveRoleFromUser,
					getUserRolesWithPermissions: mockGetUserRolesWithPermissions,
					replaceUserRoles: mockReplaceUserRoles,
				},
			}),
		)

		// Create app with simulated authenticated user
		app = new Hono()
		app.use('*', async (c, next) => {
			;(c as AuthenticatedContext).user = {
				sub: String(ADMIN_USER_ID),
				email: 'admin@example.com',
				firstName: 'Admin',
				lastName: 'User',
			}
			await next()
		})
		app.route('/users', userRoleController)
	})

	afterEach(() => {
		container.restore()
	})

	describe('GET /users/:userId/roles', () => {
		it('should return paginated user roles', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetUserRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/users/1/roles')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveLength(1)
			expect(data.total).toBe(1)
			expect(mockGetUserRoles.calls).toEqual([[1, { offset: undefined, limit: undefined }]])
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 5,
				limit: 5,
			}
			mockGetUserRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/users/1/roles?offset=5&limit=5')

			expect(res.status).toBe(200)
			expect(mockGetUserRoles.calls).toEqual([[1, { offset: 5, limit: 5 }]])
		})

		it('should return 404 when user not found', async () => {
			mockGetUserRoles.mockRejectedValue(new Error(USER_ROLE_ERRORS.USER_NOT_FOUND))

			const res = await app.request('/users/999/roles')

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should return 400 for invalid user ID', async () => {
			const res = await app.request('/users/invalid/roles')

			expect(res.status).toBe(400)
		})
	})

	describe('GET /users/:userId/permissions', () => {
		it('should return user permissions', async () => {
			// mockGetUserPermissions is already set up via mockImplementation in beforeEach
			// - Returns allUserRolePermissions for admin user (ID 999) - for permission check
			// - Returns testPermissions for other users - for the actual endpoint

			const res = await app.request('/users/1/permissions')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data).toHaveLength(1)
			expect(data[0].name).toBe('can_create_users')
			// First call is from permission middleware (user 999), second is from endpoint (user 1)
			expect(mockGetUserPermissions.calls).toEqual([[ADMIN_USER_ID], [1]])
		})

		it('should return 404 when user not found', async () => {
			// Override mockImplementation to throw for non-admin users
			mockGetUserPermissions.mockImplementation((userId: number) => {
				if (userId === ADMIN_USER_ID) {
					return Promise.resolve(allUserRolePermissions)
				}
				return Promise.reject(new Error(USER_ROLE_ERRORS.USER_NOT_FOUND))
			})

			const res = await app.request('/users/888/permissions')

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should return 400 for invalid user ID', async () => {
			const res = await app.request('/users/invalid/permissions')

			expect(res.status).toBe(400)
		})
	})

	describe('POST /users/:userId/roles', () => {
		it('should assign role to user', async () => {
			mockAssignRoleToUser.mockResolvedValue(undefined)

			const res = await app.request('/users/1/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 1 }),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.message).toBe('Role assigned successfully')
			expect(mockAssignRoleToUser.calls).toEqual([[1, 1, ADMIN_USER_ID]])
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_role_assigned')
		})

		it('should return 404 when user not found', async () => {
			mockAssignRoleToUser.mockRejectedValue(new Error(USER_ROLE_ERRORS.USER_NOT_FOUND))

			const res = await app.request('/users/999/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 1 }),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should return 404 when role not found', async () => {
			mockAssignRoleToUser.mockRejectedValue(new Error(USER_ROLE_ERRORS.ROLE_NOT_FOUND))

			const res = await app.request('/users/1/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 999 }),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.ROLE_NOT_FOUND)
		})

		it('should return 409 when role already assigned', async () => {
			mockAssignRoleToUser.mockRejectedValue(new Error(USER_ROLE_ERRORS.ROLE_ALREADY_ASSIGNED))

			const res = await app.request('/users/1/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 1 }),
			})

			expect(res.status).toBe(409)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.ROLE_ALREADY_ASSIGNED)
		})

		it('should return 400 for invalid user ID', async () => {
			const res = await app.request('/users/invalid/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 1 }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 for invalid roleId', async () => {
			const res = await app.request('/users/1/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: -1 }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when roleId is missing', async () => {
			const res = await app.request('/users/1/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('DELETE /users/:userId/roles/:roleId', () => {
		it('should remove role from user', async () => {
			mockRemoveRoleFromUser.mockResolvedValue(undefined)

			const res = await app.request('/users/1/roles/1', {
				method: 'DELETE',
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Role removed successfully')
			expect(mockRemoveRoleFromUser.calls).toEqual([[1, 1, ADMIN_USER_ID]])
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_role_removed')
		})

		it('should return 404 when user not found', async () => {
			mockRemoveRoleFromUser.mockRejectedValue(new Error(USER_ROLE_ERRORS.USER_NOT_FOUND))

			const res = await app.request('/users/999/roles/1', {
				method: 'DELETE',
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should return 404 when role not assigned', async () => {
			mockRemoveRoleFromUser.mockRejectedValue(new Error(USER_ROLE_ERRORS.ROLE_NOT_ASSIGNED))

			const res = await app.request('/users/1/roles/999', {
				method: 'DELETE',
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.ROLE_NOT_ASSIGNED)
		})

		it('should return 400 for invalid user ID', async () => {
			const res = await app.request('/users/invalid/roles/1', {
				method: 'DELETE',
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 for invalid role ID', async () => {
			const res = await app.request('/users/1/roles/invalid', {
				method: 'DELETE',
			})

			expect(res.status).toBe(400)
		})
	})

	describe('PUT /users/:userId/roles', () => {
		beforeEach(() => {
			mockGetUserRoles.mockResolvedValue({ data: [] as RoleData[], total: 0, offset: 0, limit: 1000 })
		})

		it('should return 403 when caller lacks required permissions', async () => {
			mockGetUserPermissions.mockImplementation((userId: number) => {
				if (userId === ADMIN_USER_ID) {
					return Promise.resolve([allUserRolePermissions[0]])
				}
				return Promise.resolve(testPermissions)
			})

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1, 2] }),
			})

			expect(res.status).toBe(403)
		})

		it('should replace user roles', async () => {
			mockReplaceUserRoles.mockResolvedValue(undefined)

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1, 2] }),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Roles replaced successfully')
			expect(mockReplaceUserRoles.calls).toEqual([[1, [1, 2], ADMIN_USER_ID]])
			expect(loggerSecuritySpy.calls[0][0]).toBe('user_roles_replaced')
		})

		it('should accept empty roleIds array', async () => {
			mockReplaceUserRoles.mockResolvedValue(undefined)

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [] }),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Roles replaced successfully')
			expect(mockReplaceUserRoles.calls).toEqual([[1, [], ADMIN_USER_ID]])
		})

		it('should return 404 when user not found', async () => {
			mockReplaceUserRoles.mockRejectedValue(new Error(USER_ROLE_ERRORS.USER_NOT_FOUND))

			const res = await app.request('/users/999/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1] }),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toBe(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should return 400 when roles not found', async () => {
			mockReplaceUserRoles.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 99, 100`))

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [99, 100] }),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toBe(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 99, 100`)
		})

		it('should return 400 for invalid user ID', async () => {
			const res = await app.request('/users/invalid/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1] }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 for invalid roleIds', async () => {
			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [-1] }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when roleIds exceeds maximum length', async () => {
			const tooManyRoleIds = Array.from({ length: 101 }, (_, i) => i + 1)

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: tooManyRoleIds }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when roleIds contains duplicates', async () => {
			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1, 2, 2, 3] }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when roleIds is missing', async () => {
			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when replacing would remove non-removable roles', async () => {
			mockReplaceUserRoles.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: 1`))

			const res = await app.request('/users/1/roles', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [2, 3] }),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toBe(`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: 1`)
		})
	})
})
