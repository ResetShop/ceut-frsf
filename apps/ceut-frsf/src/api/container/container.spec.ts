import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { seedDbEnv } from '../config/db.env'
import { AuthService } from '../modules/auth/auth.service'
import { TokenMaintenanceService } from '../modules/auth/token-maintenance.service'
import { container } from './container'
import { InMemoryContainer } from './container.mock'
import type { Cradle } from './container.types'

/**
 * DI Container Integration Tests
 *
 * These tests verify that all dependencies are properly registered and resolvable.
 * Environment validation (PASETO_SECRET_KEY) is tested implicitly - if the env var
 * is missing or invalid, the container will throw on first access (when
 * container.cradle or container.verify() is called), causing these tests to fail.
 */
function createMockRoleService(): Cradle['roleService'] {
	return {
		getAllRoles: fn(),
		getRole: fn(),
		getRoleByCode: fn(),
		createRole: fn(),
		updateRole: fn(),
		deleteRole: fn(),
		getRolePermissions: fn(),
		assignPermissionsToRole: fn(),
	}
}

describe('DI Container', () => {
	beforeEach(() => {
		clearAllMocks()
		// Seed dbEnv so the lazy `createDrizzlePgConnector` factory resolves with a valid
		// connection string in unit tests (test-setup.ts does not set PG_CONNECTION_STRING).
		// Drizzle builds a connection pool lazily, so no real DB connection is attempted.
		seedDbEnv()
	})

	describe('dependency resolution', () => {
		it('should resolve db infrastructure', () => {
			expect(container.cradle.db).toBeDefined()
		})

		it('should resolve emailRepository', () => {
			expect(container.cradle.emailRepository).toBeDefined()
		})

		it('should resolve emailService', () => {
			expect(container.cradle.emailService).toBeDefined()
		})

		it('should resolve pasetoService', () => {
			expect(container.cradle.pasetoService).toBeDefined()
		})

		it('should resolve pasetoConfig', () => {
			expect(container.cradle.pasetoConfig).toBeDefined()
		})

		it('should resolve authConfig', () => {
			expect(container.cradle.authConfig).toBeDefined()
		})

		it('should resolve userRepository', () => {
			expect(container.cradle.userRepository).toBeDefined()
		})

		it('should resolve authRepository', () => {
			expect(container.cradle.authRepository).toBeDefined()
		})

		it('should resolve refreshTokenRepository', () => {
			expect(container.cradle.refreshTokenRepository).toBeDefined()
		})

		it('should resolve passwordResetTokenRepository', () => {
			expect(container.cradle.passwordResetTokenRepository).toBeDefined()
		})

		it('should resolve passwordResetService', () => {
			expect(container.cradle.passwordResetService).toBeDefined()
		})

		it('should resolve authService', () => {
			expect(container.cradle.authService).toBeDefined()
		})

		it('should resolve authPasswordService', () => {
			expect(container.cradle.authPasswordService).toBeDefined()
		})

		it('should resolve verifyPassword', () => {
			expect(container.cradle.verifyPassword).toBeDefined()
		})

		it('should resolve tokenMaintenanceService', () => {
			expect(container.cradle.tokenMaintenanceService).toBeDefined()
		})
	})

	describe('singleton behavior', () => {
		it('should return the same authService instance', () => {
			const service1 = container.cradle.authService
			const service2 = container.cradle.authService
			expect(service1).toBe(service2)
		})

		it('should return the same emailService instance', () => {
			const service1 = container.cradle.emailService
			const service2 = container.cradle.emailService
			expect(service1).toBe(service2)
		})

		it('should return the same pasetoService instance', () => {
			const service1 = container.cradle.pasetoService
			const service2 = container.cradle.pasetoService
			expect(service1).toBe(service2)
		})

		it('should return the same pasetoConfig instance', () => {
			const config1 = container.cradle.pasetoConfig
			const config2 = container.cradle.pasetoConfig
			expect(config1).toBe(config2)
		})

		it('should return the same userRepository instance', () => {
			const repo1 = container.cradle.userRepository
			const repo2 = container.cradle.userRepository
			expect(repo1).toBe(repo2)
		})

		it('should return the same tokenMaintenanceService instance', () => {
			const service1 = container.cradle.tokenMaintenanceService
			const service2 = container.cradle.tokenMaintenanceService
			expect(service1).toBe(service2)
			expect(service1).toBeInstanceOf(TokenMaintenanceService)
		})
	})

	describe('container.verify', () => {
		it('should not throw when all critical dependencies are resolvable', () => {
			expect(() => container.verify()).not.toThrow()
		})
	})

	describe('test cradle proxy', () => {
		afterEach(() => {
			container.restore()
		})

		it('should return mocked service when test cradle is set', () => {
			const mockRoleService = createMockRoleService()
			container.use(
				new InMemoryContainer({
					roleService: mockRoleService,
				}),
			)

			expect(container.cradle.roleService).toBe(mockRoleService)
		})

		it('should throw when accessing unmocked service in test mode', () => {
			container.use(
				new InMemoryContainer({
					roleService: createMockRoleService(),
				}),
			)

			// authService wasn't mocked, so accessing it should throw
			expect(() => container.cradle.authService).toThrow('Test mock missing for service: authService')
		})

		it('should return real service after test cradle is reset', () => {
			container.use(
				new InMemoryContainer({
					roleService: createMockRoleService(),
				}),
			)

			container.restore()

			// After reset, real authService should be accessible
			expect(container.cradle.authService).toBeDefined()
			expect(container.cradle.authService).toBeInstanceOf(AuthService)
		})
	})

	describe('container.teardownDb', () => {
		it('closes the resolved database pool by ending its client', async () => {
			const pool = container.cradle.db.$client
			const endSpy = fn().mockResolvedValue(undefined)
			pool.end = endSpy as unknown as typeof pool.end

			await container.teardownDb()

			expect(endSpy.calls).toHaveLength(1)
		})

		it('swallows a pool-close error so teardown stays idempotent', async () => {
			const pool = container.cradle.db.$client
			pool.end = fn().mockRejectedValue(new Error('Called end on pool more than once')) as unknown as typeof pool.end

			await expect(container.teardownDb()).resolves.toBeUndefined()
		})
	})
})
