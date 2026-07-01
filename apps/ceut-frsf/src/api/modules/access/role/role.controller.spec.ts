import { permission } from '@contracts/permission/permission.constants'
import { logger } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../../container/container'
import { InMemoryContainer } from '../../../container/container.mock'
import type { PaginatedResponse } from '../../../interfaces'
import type { AuthenticatedContext } from '../../../middlewares/verify-access-token.middleware'
import type { ListRolesParams, PermissionData, RoleData } from './interfaces'
import roleController from './role.controller'
import { InvalidPermissionIdsError, ROLE_ERRORS } from './role.service'

describe('Role Controller', () => {
	// Create mock functions
	const mockGetAllRoles = fn<[ListRolesParams], Promise<PaginatedResponse<RoleData>>>()
	const mockGetRole = fn<[number], Promise<RoleData | null>>()
	const mockCreateRole = fn<[{ name: string; code: string; description?: string }], Promise<RoleData>>()
	const mockUpdateRole = fn<[number, { description: string }], Promise<RoleData>>()
	const mockDeleteRole = fn<[number], Promise<void>>()
	const mockGetRolePermissions = fn<
		[number, { offset?: number; limit?: number }],
		Promise<PaginatedResponse<PermissionData>>
	>()
	const mockAssignPermissionsToRole = fn<[number, number[], number?], Promise<void>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()

	// Create app with auth middleware that simulates authenticated user
	let app: Hono

	// Test data
	const testRole: RoleData = {
		id: 1,
		name: 'Administrator',
		code: 'admin',
		description: 'System administrator',
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

	// All admin:roles:* permissions for testing
	const allRolePermissions: PermissionData[] = [
		{
			id: 1,
			name: permission('admin:roles:read'),
			description: 'Read roles',
			module: 'admin',
			resource: 'roles',
			action: 'read',
		},
		{
			id: 2,
			name: permission('admin:roles:create'),
			description: 'Create roles',
			module: 'admin',
			resource: 'roles',
			action: 'create',
		},
		{
			id: 3,
			name: permission('admin:roles:update'),
			description: 'Update roles',
			module: 'admin',
			resource: 'roles',
			action: 'update',
		},
		{
			id: 4,
			name: permission('admin:roles:delete'),
			description: 'Delete roles',
			module: 'admin',
			resource: 'roles',
			action: 'delete',
		},
	]

	let loggerSecuritySpy: MockFn

	beforeEach(() => {
		clearAllMocks()
		loggerSecuritySpy = spyOn(logger, 'security')

		// Mock getUserPermissions to return all role permissions
		mockGetUserPermissions.mockResolvedValue(allRolePermissions)

		container.use(
			new InMemoryContainer({
				roleService: {
					getAllRoles: mockGetAllRoles,
					getRole: mockGetRole,
					createRole: mockCreateRole,
					updateRole: mockUpdateRole,
					deleteRole: mockDeleteRole,
					getRolePermissions: mockGetRolePermissions,
					assignPermissionsToRole: mockAssignPermissionsToRole,
				},
				userRoleService: {
					getUserPermissions: mockGetUserPermissions,
				},
			}),
		)

		// Create app with simulated authenticated user
		app = new Hono()
		app.use('*', async (c, next) => {
			;(c as AuthenticatedContext).user = {
				sub: '1',
				email: 'admin@example.com',
				firstName: 'Admin',
				lastName: 'User',
			}
			await next()
		})
		app.route('/access/roles', roleController)
	})

	afterEach(() => {
		container.restore()
	})

	describe('GET /access/roles', () => {
		it('should return paginated roles', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetAllRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveLength(1)
			expect(data.total).toBe(1)
			expect(mockGetAllRoles.calls).toEqual([[{ offset: undefined, limit: undefined, search: undefined }]])
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 10,
				offset: 5,
				limit: 5,
			}
			mockGetAllRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles?offset=5&limit=5')

			expect(res.status).toBe(200)
			expect(mockGetAllRoles.calls).toEqual([[{ offset: 5, limit: 5, search: undefined }]])
		})

		it('should pass search parameter to service', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetAllRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles?search=admin')

			expect(res.status).toBe(200)
			expect(mockGetAllRoles.calls).toEqual([[{ offset: undefined, limit: undefined, search: 'admin' }]])
		})

		it('should pass search with pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 5,
				offset: 2,
				limit: 3,
			}
			mockGetAllRoles.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles?search=admin&offset=2&limit=3')

			expect(res.status).toBe(200)
			expect(mockGetAllRoles.calls).toEqual([[{ offset: 2, limit: 3, search: 'admin' }]])
		})

		it('should validate offset is non-negative', async () => {
			const res = await app.request('/access/roles?offset=-1')

			expect(res.status).toBe(400)
		})

		it('should validate limit is positive', async () => {
			const res = await app.request('/access/roles?limit=0')

			expect(res.status).toBe(400)
		})

		it('should validate limit max value', async () => {
			const res = await app.request('/access/roles?limit=501')

			expect(res.status).toBe(400)
		})
	})

	describe('GET /access/roles/:id', () => {
		it('should return role when found', async () => {
			mockGetRole.mockResolvedValue(testRole)

			const res = await app.request('/access/roles/1')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.code).toBe('admin')
		})

		it('should return 404 when role not found', async () => {
			mockGetRole.mockResolvedValue(null)

			const res = await app.request('/access/roles/999')

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/access/roles/invalid')

			expect(res.status).toBe(400)
		})
	})

	describe('POST /access/roles', () => {
		it('should create a new role', async () => {
			const newRole = { ...testRole, id: 2, code: 'editor', name: 'Editor' }
			mockCreateRole.mockResolvedValue(newRole)

			const res = await app.request('/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Editor',
					code: 'editor',
					description: 'Content editor',
				}),
			})

			expect(res.status).toBe(201)
			const data = await res.json()
			expect(data.code).toBe('editor')
			expect(loggerSecuritySpy.calls[0][0]).toBe('role_created')
		})

		it('should return 409 when code already exists', async () => {
			mockCreateRole.mockRejectedValue(new Error(ROLE_ERRORS.CODE_EXISTS))

			const res = await app.request('/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Admin',
					code: 'admin',
				}),
			})

			expect(res.status).toBe(409)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.CODE_EXISTS)
		})

		it('should validate required fields', async () => {
			const res = await app.request('/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test',
					// missing code
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should validate code format', async () => {
			const res = await app.request('/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test',
					code: 'Invalid-Code', // uppercase and hyphen not allowed
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should allow code starting with letter and containing underscores', async () => {
			mockCreateRole.mockResolvedValue({ ...testRole, code: 'my_role_123' })

			const res = await app.request('/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'My Role',
					code: 'my_role_123',
				}),
			})

			expect(res.status).toBe(201)
		})
	})

	describe('PUT /access/roles/:id', () => {
		it('should update role description', async () => {
			const updatedRole = { ...testRole, description: 'Updated description' }
			mockUpdateRole.mockResolvedValue(updatedRole)

			const res = await app.request('/access/roles/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'Updated description',
				}),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.description).toBe('Updated description')
			expect(loggerSecuritySpy.calls[0][0]).toBe('role_updated')
		})

		it('should return 404 when role not found', async () => {
			mockUpdateRole.mockRejectedValue(new Error(ROLE_ERRORS.NOT_FOUND))

			const res = await app.request('/access/roles/999', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'New description',
				}),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/access/roles/invalid', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'New description',
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should validate description max length', async () => {
			const res = await app.request('/access/roles/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'x'.repeat(501),
				}),
			})

			expect(res.status).toBe(400)
		})
	})

	describe('DELETE /access/roles/:id', () => {
		it('should delete role successfully', async () => {
			mockDeleteRole.mockResolvedValue(undefined)

			const res = await app.request('/access/roles/2', {
				method: 'DELETE',
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Role deleted successfully')
			expect(loggerSecuritySpy.calls[0][0]).toBe('role_deleted')
		})

		it('should return 404 when role not found', async () => {
			mockDeleteRole.mockRejectedValue(new Error(ROLE_ERRORS.NOT_FOUND))

			const res = await app.request('/access/roles/999', {
				method: 'DELETE',
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_FOUND)
		})

		it('should return 403 when role is not removable', async () => {
			mockDeleteRole.mockRejectedValue(new Error(ROLE_ERRORS.NOT_REMOVABLE))

			const res = await app.request('/access/roles/1', {
				method: 'DELETE',
			})

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_REMOVABLE)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/access/roles/invalid', {
				method: 'DELETE',
			})

			expect(res.status).toBe(400)
		})
	})

	describe('GET /access/roles/:id/permissions', () => {
		it('should return paginated permissions', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: testPermissions,
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockGetRolePermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles/1/permissions')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveLength(1)
			expect(data.total).toBe(1)
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: testPermissions,
				total: 10,
				offset: 5,
				limit: 5,
			}
			mockGetRolePermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/roles/1/permissions?offset=5&limit=5')

			expect(res.status).toBe(200)
			expect(mockGetRolePermissions.calls).toEqual([[1, { offset: 5, limit: 5 }]])
		})

		it('should return 404 when role not found', async () => {
			mockGetRolePermissions.mockRejectedValue(new Error(ROLE_ERRORS.NOT_FOUND))

			const res = await app.request('/access/roles/999/permissions')

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/access/roles/invalid/permissions')

			expect(res.status).toBe(400)
		})
	})

	describe('PUT /access/roles/:id/permissions', () => {
		beforeEach(() => {
			mockGetRolePermissions.mockResolvedValue({ data: [] as PermissionData[], total: 0, offset: 0, limit: 1000 })
		})

		it('should assign permissions to role', async () => {
			mockAssignPermissionsToRole.mockResolvedValue(undefined)

			const res = await app.request('/access/roles/1/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissionIds: [1, 2, 3],
				}),
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Permissions assigned successfully')
			expect(mockAssignPermissionsToRole.calls).toEqual([[1, [1, 2, 3], 1]])
			expect(loggerSecuritySpy.calls[0][0]).toBe('role_permissions_changed')
		})

		it('should return 404 when role not found', async () => {
			mockAssignPermissionsToRole.mockRejectedValue(new Error(ROLE_ERRORS.NOT_FOUND))

			const res = await app.request('/access/roles/999/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissionIds: [1],
				}),
			})

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.NOT_FOUND)
		})

		it('should return 400 for invalid ID', async () => {
			const res = await app.request('/access/roles/invalid/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissionIds: [1],
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should validate permissionIds is an array of positive integers', async () => {
			const res = await app.request('/access/roles/1/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissionIds: [-1, 0],
				}),
			})

			expect(res.status).toBe(400)
		})

		it('should validate permissionIds is required', async () => {
			const res = await app.request('/access/roles/1/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 with invalid IDs when permission IDs do not exist', async () => {
			mockAssignPermissionsToRole.mockRejectedValue(new InvalidPermissionIdsError([999, 1000]))

			const res = await app.request('/access/roles/1/permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissionIds: [1, 999, 1000],
				}),
			})

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data.error).toContain(ROLE_ERRORS.INVALID_PERMISSION_IDS)
			expect(data.details.invalidIds).toEqual([999, 1000])
		})
	})
})
