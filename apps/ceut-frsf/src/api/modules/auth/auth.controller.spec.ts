import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import type { AuthenticatedContext } from '../../middlewares/verify-access-token.middleware'
import type { RoleWithPermissions } from '../access/role/interfaces'
import authController from './auth.controller'

describe('Auth Controller - /me endpoint', () => {
	const app = new Hono()

	// Mock middleware that sets user context
	app.use('/auth/*', async (c, next) => {
		const authHeader = c.req.header('Authorization')
		if (authHeader?.startsWith('Bearer valid-token')) {
			;(c as AuthenticatedContext).user = {
				sub: '1',
				email: 'test@example.com',
				firstName: 'John',
				lastName: 'Doe',
			}
		}
		await next()
	})

	app.route('/auth', authController)

	const mockGetUserRolesWithPermissions = fn<[number], Promise<RoleWithPermissions[]>>()
	const mockGetMustChangePassword = fn<[number], Promise<boolean>>()

	beforeEach(() => {
		clearAllMocks()
		mockGetMustChangePassword.mockResolvedValue(false)
		container.use(
			new InMemoryContainer({
				userRoleService: {
					getUserRolesWithPermissions: mockGetUserRolesWithPermissions,
				},
				authPasswordService: {
					getMustChangePassword: mockGetMustChangePassword,
				},
			}),
		)
	})

	afterEach(() => {
		container.restore()
	})

	it('should return 401 when no authorization provided', async () => {
		const res = await app.request('/auth/me')

		expect(res.status).toBe(401)
		const data = await res.json()
		expect(data.error).toBe('Unauthorized')
	})

	it('should return user info with roles', async () => {
		const mockRoles: RoleWithPermissions[] = [
			{
				id: 1,
				code: 'admin',
				name: 'Administrator',
				description: 'Full system access',
				removable: true,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01'),
				permissions: [
					{ id: 1, name: 'Read Users', description: 'View users', module: 'admin', resource: 'users', action: 'read' },
					{
						id: 2,
						name: 'Write Users',
						description: 'Create/update users',
						module: 'admin',
						resource: 'users',
						action: 'write',
					},
				],
			},
		]
		mockGetUserRolesWithPermissions.mockResolvedValue(mockRoles)

		const res = await app.request('/auth/me', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		expect(res.status).toBe(200)
		const data = await res.json()

		expect(data.id).toBe(1)
		expect(data.email).toBe('test@example.com')
		expect(data.firstName).toBe('John')
		expect(data.lastName).toBe('Doe')
		expect(data.roles).toHaveLength(1)
		expect(data.roles[0].code).toBe('admin')
		expect(data.roles[0].permissions).toHaveLength(2)
		expect(data.roles[0].permissions[0].resource).toBe('users')
		expect(data.roles[0].permissions[0].action).toBe('read')
		expect(data.mustChangePassword).toBe(false)
	})

	it('should reflect mustChangePassword from the auth password service', async () => {
		mockGetUserRolesWithPermissions.mockResolvedValue([])
		mockGetMustChangePassword.mockResolvedValue(true)

		const res = await app.request('/auth/me', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.mustChangePassword).toBe(true)
	})

	it('should return empty roles array when user has no roles', async () => {
		mockGetUserRolesWithPermissions.mockResolvedValue([])

		const res = await app.request('/auth/me', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		expect(res.status).toBe(200)
		const data = await res.json()

		expect(data.id).toBe(1)
		expect(data.roles).toEqual([])
	})
})

describe('Auth Controller - cleanup-tokens endpoint', () => {
	const app = new Hono()
	app.route('/auth', authController)

	// Create mock function
	const mockCleanupExpiredTokens = fn<[], Promise<{ deletedCount: number; incomplete: boolean } | null>>()

	// Redirects the container so the cleanup handler reads the given cronSecret from authConfig.
	// Pass undefined (the default) to simulate an unconfigured CRON_SECRET.
	function useContainer(cronSecret?: string) {
		container.use(
			new InMemoryContainer({
				tokenMaintenanceService: {
					cleanupExpiredTokens: mockCleanupExpiredTokens,
				},
				authConfig: { cronSecret },
			}),
		)
	}

	beforeEach(() => {
		clearAllMocks()
		useContainer()
	})

	afterEach(() => {
		container.restore()
	})

	describe('Authorization', () => {
		it('should return 401 when no authorization provided', async () => {
			const res = await app.request('/auth/cleanup-tokens')

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe('Unauthorized')
		})

		it('should return 401 when CRON_SECRET is too short', async () => {
			useContainer('short') // Less than 32 chars

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: 'Bearer short',
				},
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe('Unauthorized')
		})

		it('should return 401 when CRON_SECRET does not match', async () => {
			const validSecret = 'a'.repeat(32) // 32 chars minimum
			useContainer(validSecret)

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: 'Bearer wrong-secret-that-is-long-enough',
				},
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe('Unauthorized')
		})

		it('should return 401 when Authorization header format is wrong', async () => {
			const validSecret = 'a'.repeat(32)
			useContainer(validSecret)

			// Missing "Bearer " prefix
			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: validSecret,
				},
			})

			expect(res.status).toBe(401)
			const data = await res.json()
			expect(data.error).toBe('Unauthorized')
		})

		it('should succeed with valid CRON_SECRET', async () => {
			const validSecret = 'a'.repeat(32)
			useContainer(validSecret)
			mockCleanupExpiredTokens.mockResolvedValue({ deletedCount: 5, incomplete: false })

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: `Bearer ${validSecret}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Cleanup completed')
			expect(data.deletedCount).toBe(5)
			expect(data.incomplete).toBe(false)
		})
	})

	describe('Cleanup Results', () => {
		const validSecret = 'b'.repeat(32)

		beforeEach(() => {
			useContainer(validSecret)
		})

		it('should return cleanup completed message with count', async () => {
			mockCleanupExpiredTokens.mockResolvedValue({ deletedCount: 100, incomplete: false })

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: `Bearer ${validSecret}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Cleanup completed')
			expect(data.deletedCount).toBe(100)
			expect(data.incomplete).toBe(false)
		})

		it('should return incomplete message when max batch limit reached', async () => {
			mockCleanupExpiredTokens.mockResolvedValue({ deletedCount: 100000, incomplete: true })

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: `Bearer ${validSecret}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Cleanup incomplete - max batch limit reached')
			expect(data.deletedCount).toBe(100000)
			expect(data.incomplete).toBe(true)
		})

		it('should return "already in progress" when cleanup returns null', async () => {
			mockCleanupExpiredTokens.mockResolvedValue(null)

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: `Bearer ${validSecret}`,
				},
			})

			expect(res.status).toBe(200)
			const data = await res.json()
			expect(data.message).toBe('Cleanup already in progress')
			expect(data.deletedCount).toBe(0)
			expect(data.incomplete).toBe(false)
		})

		it('should return 500 when cleanup throws an error', async () => {
			mockCleanupExpiredTokens.mockRejectedValue(new Error('Database connection failed'))

			const res = await app.request('/auth/cleanup-tokens', {
				headers: {
					Authorization: `Bearer ${validSecret}`,
				},
			})

			expect(res.status).toBe(500)
			const data = await res.json()
			expect(data.error).toBe('Cleanup failed')
		})
	})
})
