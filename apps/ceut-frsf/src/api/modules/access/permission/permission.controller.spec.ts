import { permission } from '@contracts/permission/permission.constants'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../../container/container'
import { InMemoryContainer } from '../../../container/container.mock'
import type { PaginatedResponse } from '../../../interfaces'
import type { AuthenticatedContext } from '../../../middlewares/verify-access-token.middleware'
import type { PermissionData } from '../role/interfaces'
import type { ListPermissionsParams } from './interfaces'
import permissionController from './permission.controller'

describe('Permission Controller', () => {
	const mockGetAllPermissions = fn<[ListPermissionsParams], Promise<PaginatedResponse<PermissionData>>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()

	let app: Hono

	const testPermissions: PermissionData[] = [
		{
			id: 1,
			name: 'admin:users:create',
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
		{ id: 2, name: 'admin:users:read', description: 'View users', module: 'admin', resource: 'users', action: 'read' },
	]

	// Permission that grants access to the endpoint
	const requiredPermission: PermissionData = {
		id: 100,
		name: permission('admin:permissions:read'),
		description: 'View all system permissions',
		module: 'admin',
		resource: 'permissions',
		action: 'read',
	}

	beforeEach(() => {
		clearAllMocks()

		mockGetUserPermissions.mockResolvedValue([requiredPermission])

		container.use(
			new InMemoryContainer({
				permissionService: {
					getAllPermissions: mockGetAllPermissions,
				},
				userRoleService: {
					getUserPermissions: mockGetUserPermissions,
				},
			}),
		)

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
		app.route('/access/permissions', permissionController)
	})

	afterEach(() => {
		container.restore()
	})

	describe('GET /access/permissions', () => {
		it('should return paginated permissions', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: testPermissions,
				total: 2,
				offset: 0,
				limit: 10,
			}
			mockGetAllPermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/permissions')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.data).toHaveLength(2)
			expect(data.total).toBe(2)
			expect(mockGetAllPermissions.calls).toEqual([[{ offset: undefined, limit: undefined, search: undefined }]])
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: testPermissions,
				total: 10,
				offset: 5,
				limit: 5,
			}
			mockGetAllPermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/permissions?offset=5&limit=5')

			expect(res.status).toBe(200)
			expect(mockGetAllPermissions.calls).toEqual([[{ offset: 5, limit: 5, search: undefined }]])
		})

		it('should pass search parameter to service', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: testPermissions,
				total: 2,
				offset: 0,
				limit: 10,
			}
			mockGetAllPermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/permissions?search=users')

			expect(res.status).toBe(200)
			expect(mockGetAllPermissions.calls).toEqual([[{ offset: undefined, limit: undefined, search: 'users' }]])
		})

		it('should pass search with pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<PermissionData> = {
				data: [testPermissions[0]],
				total: 2,
				offset: 0,
				limit: 1,
			}
			mockGetAllPermissions.mockResolvedValue(paginatedResponse)

			const res = await app.request('/access/permissions?search=users&offset=0&limit=1')

			expect(res.status).toBe(200)
			expect(mockGetAllPermissions.calls).toEqual([[{ offset: 0, limit: 1, search: 'users' }]])
		})

		it('should validate offset is non-negative', async () => {
			const res = await app.request('/access/permissions?offset=-1')

			expect(res.status).toBe(400)
		})

		it('should validate limit is positive', async () => {
			const res = await app.request('/access/permissions?limit=0')

			expect(res.status).toBe(400)
		})

		it('should validate limit max value', async () => {
			const res = await app.request('/access/permissions?limit=501')

			expect(res.status).toBe(400)
		})

		it('should return 403 when user lacks permission', async () => {
			// Override to return no permissions
			mockGetUserPermissions.mockResolvedValue([])

			const res = await app.request('/access/permissions')

			expect(res.status).toBe(403)
		})
	})
})
