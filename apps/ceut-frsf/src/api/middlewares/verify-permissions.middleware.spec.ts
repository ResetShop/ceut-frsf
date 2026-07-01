import { permission } from '@contracts/permission/permission.constants'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../container/container'
import { InMemoryContainer } from '../container/container.mock'
import type { PermissionData } from '../modules/access/role/interfaces'
import type { AuthenticatedContext } from './verify-access-token.middleware'
import { requireAllPermissions, requireAnyPermission, requirePermission } from './verify-permissions.middleware'

describe('permission helper', () => {
	it('should accept valid module:resource:action permission names', () => {
		expect(() => permission('admin:users:create')).not.toThrow()
		expect(() => permission('billing:invoices:read')).not.toThrow()
		expect(() => permission('reports:sales:export')).not.toThrow()
		expect(() => permission('admin:user_roles:assign')).not.toThrow()
		expect(() => permission('api:endpoints123:call')).not.toThrow()
	})

	it('should reject permission names with uppercase letters', () => {
		expect(() => permission('Admin:users:create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:Users:create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:users:CREATE')).toThrow(/Invalid permission name/)
	})

	it('should reject permission names starting with numbers', () => {
		expect(() => permission('123:users:create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:123users:create')).toThrow(/Invalid permission name/)
	})

	it('should reject permission names with wrong number of segments', () => {
		expect(() => permission('admin')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:users')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:users:create:extra')).toThrow(/Invalid permission name/)
	})

	it('should reject permission names with invalid characters', () => {
		expect(() => permission('admin-module:users:create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:users:create action')).toThrow(/Invalid permission name/)
		expect(() => permission('admin.module:users:create')).toThrow(/Invalid permission name/)
	})

	it('should reject empty strings', () => {
		expect(() => permission('')).toThrow(/Invalid permission name/)
	})

	it('should reject empty segments', () => {
		expect(() => permission(':users:create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin::create')).toThrow(/Invalid permission name/)
		expect(() => permission('admin:users:')).toThrow(/Invalid permission name/)
	})
})

describe('Permissions Middleware', () => {
	// Mock functions
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()

	// Test permissions
	const testPermissions: PermissionData[] = [
		{
			id: 1,
			name: 'admin:users:create',
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
		{
			id: 2,
			name: 'admin:users:delete',
			description: 'Delete users',
			module: 'admin',
			resource: 'users',
			action: 'delete',
		},
	]

	beforeEach(() => {
		clearAllMocks()
		container.use(
			new InMemoryContainer({
				userRoleService: {
					getUserPermissions: mockGetUserPermissions,
				},
			}),
		)
	})

	afterEach(() => {
		container.restore()
	})

	describe('requirePermission', () => {
		it('should return 401 if user is not authenticated', async () => {
			const app = new Hono()
			app.use('*', requirePermission(permission('admin:users:create')))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe('Unauthorized')
		})

		it('should return 403 if user does not have the required permission', async () => {
			mockGetUserPermissions.mockResolvedValue([])

			const app = new Hono()
			// Simulate authenticated user
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requirePermission(permission('admin:users:create')))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(403)
			const data = await res.json()
			expect(data.error).toBe('Forbidden')
		})

		it('should allow access if user has the required permission', async () => {
			mockGetUserPermissions.mockResolvedValue(testPermissions)

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requirePermission(permission('admin:users:create')))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.success).toBe(true)
		})

		it('should cache permissions for subsequent middleware calls', async () => {
			mockGetUserPermissions.mockResolvedValue(testPermissions)

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requirePermission(permission('admin:users:create')))
			app.use('*', requirePermission(permission('admin:users:delete')))
			app.get('/test', (c) => c.json({ success: true }))

			await app.request('/test')

			// Should only call getUserPermissions once due to caching
			expect(mockGetUserPermissions.calls).toHaveLength(1)
		})

		it('should return 500 if getUserPermissions throws an error', async () => {
			mockGetUserPermissions.mockRejectedValue(new Error('Database connection failed'))

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = {
					sub: '999',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
				}
				await next()
			})
			app.use('*', requirePermission(permission('admin:users:create')))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(500)
			const data = await res.json()
			expect(data.error).toBe('Internal server error')
		})
	})

	describe('requireAnyPermission', () => {
		it('should return 401 if user is not authenticated', async () => {
			const app = new Hono()
			app.use('*', requireAnyPermission([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(401)
		})

		it('should return 403 if user has none of the required permissions', async () => {
			mockGetUserPermissions.mockResolvedValue([])

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requireAnyPermission([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(403)
		})

		it('should allow access if user has at least one of the required permissions', async () => {
			mockGetUserPermissions.mockResolvedValue([testPermissions[0]]) // Only admin:users:create

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requireAnyPermission([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(200)
		})
	})

	describe('requireAllPermissions', () => {
		it('should return 401 if user is not authenticated', async () => {
			const app = new Hono()
			app.use('*', requireAllPermissions([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(401)
		})

		it('should return 403 if user is missing any required permission', async () => {
			mockGetUserPermissions.mockResolvedValue([testPermissions[0]]) // Only admin:users:create

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requireAllPermissions([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(403)
		})

		it('should allow access if user has all required permissions', async () => {
			mockGetUserPermissions.mockResolvedValue(testPermissions)

			const app = new Hono()
			app.use('*', async (c, next) => {
				;(c as AuthenticatedContext).user = { sub: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
				await next()
			})
			app.use('*', requireAllPermissions([permission('admin:users:create'), permission('admin:users:delete')]))
			app.get('/test', (c) => c.json({ success: true }))

			const res = await app.request('/test')

			expect(res.status).toBe(200)
		})
	})
})
