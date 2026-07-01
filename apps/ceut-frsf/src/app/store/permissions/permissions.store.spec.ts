import { TestBed } from '@angular/core/testing'
import { PermissionsApi } from '@providers/permissions/permissions.interface'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { NEVER, of, throwError } from 'rxjs'
import { PermissionsStore } from './permissions.store'

describe('PermissionsStore', () => {
	let store: InstanceType<typeof PermissionsStore>
	let permissionsApiMock: Record<keyof PermissionsApi, MockFn>

	/**
	 * Configures TestBed and injects the store.
	 * withHooks.onInit triggers loadPermissions immediately, so getAllUnpaginated
	 * must be mocked before calling this. A default empty-list mock is set in
	 * beforeEach as a safety net — override it before calling setupStore() when needed.
	 */
	function setupStore(): void {
		TestBed.configureTestingModule({
			providers: [PermissionsStore, { provide: PermissionsApi, useValue: permissionsApiMock }],
		})
		store = TestBed.inject(PermissionsStore)
		TestBed.tick()
	}

	beforeEach(() => {
		clearAllMocks()

		permissionsApiMock = {
			getAllUnpaginated: fn(),
		}

		// Default mock — prevents onInit from firing against an unmocked fn().
		// Tests that need a different initial response override before calling setupStore().
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of([]))
	})

	describe('initial state', () => {
		it('should start loading immediately via onInit', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(NEVER)
			setupStore()

			expect(store.permissions()).toEqual([])
			expect(store.isLoading()).toBe(true)
			expect(store.isCached()).toBe(false)
			expect(store.readError().list).toBeNull()
		})

		it('should have correct state after initial load completes', () => {
			setupStore()

			expect(store.permissions()).toEqual([])
			expect(store.isLoading()).toBe(false)
			expect(store.isCached()).toBe(true)
			expect(store.readError().list).toBeNull()
		})

		it('should have correct computed signals', () => {
			setupStore()

			expect(store.permissionsGroupedByResource().size).toBe(0)
			expect(store.permissionsGroupedArray()).toHaveLength(0)
			expect(store.hasReadError()).toBe(false)
		})
	})

	describe('loadPermissions', () => {
		it('should load permissions and update state on success', () => {
			const permissions = [
				createMockPermissionData({ id: 1, resource: 'users', action: 'read' }),
				createMockPermissionData({ id: 2, resource: 'users', action: 'write', name: 'Write Users' }),
			]
			permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))
			setupStore()

			expect(store.permissions()).toHaveLength(2)
			expect(store.isCached()).toBe(true)
			expect(store.isLoading()).toBe(false)
			expect(store.readError().list).toBeNull()
		})

		it('should set isLoading during load', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(NEVER)
			setupStore()

			expect(store.isLoading()).toBe(true)
		})

		it('should set error on failure', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Network error')))
			setupStore()

			expect(store.isLoading()).toBe(false)
			expect(store.readError().list).toBe('Failed to load permissions')
			expect(store.hasReadError()).toBe(true)
			expect(store.isCached()).toBe(false)
		})

		it('should skip API call when already cached', () => {
			setupStore()
			expect(store.isCached()).toBe(true)

			const callsBefore = permissionsApiMock.getAllUnpaginated.calls.length
			store.loadPermissions()

			expect(permissionsApiMock.getAllUnpaginated.calls).toHaveLength(callsBefore)
		})

		it('should clear error on successful retry', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Error')))
			setupStore()
			expect(store.readError().list).toBe('Failed to load permissions')

			// Retry succeeds — isCached is still false after error, so loadPermissions proceeds
			permissionsApiMock.getAllUnpaginated.mockReturnValue(of([createMockPermissionData()]))
			store.loadPermissions()

			expect(store.readError().list).toBeNull()
			expect(store.hasReadError()).toBe(false)
			expect(store.isCached()).toBe(true)
		})
	})

	describe('reload', () => {
		it('should force re-fetch when already cached', () => {
			setupStore()
			const callsBefore = permissionsApiMock.getAllUnpaginated.calls.length

			permissionsApiMock.getAllUnpaginated.mockReturnValue(
				of([createMockPermissionData(), createMockPermissionData({ id: 2, name: 'Write Users', action: 'write' })]),
			)

			store.reload()

			expect(permissionsApiMock.getAllUnpaginated.calls).toHaveLength(callsBefore + 1)
			expect(store.permissions()).toHaveLength(2)
			expect(store.isCached()).toBe(true)
		})

		it('should set isCached true after successful reload', () => {
			setupStore()

			permissionsApiMock.getAllUnpaginated.mockReturnValue(of([createMockPermissionData()]))
			store.reload()

			expect(store.isCached()).toBe(true)
		})
	})

	describe('computed signals', () => {
		it('should group permissions by resource', () => {
			const permissions = [
				createMockPermissionData({ id: 1, resource: 'users', action: 'read' }),
				createMockPermissionData({ id: 2, resource: 'users', action: 'write', name: 'Write Users' }),
				createMockPermissionData({ id: 3, resource: 'roles', action: 'read', name: 'Read Roles' }),
			]
			permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))
			setupStore()

			const grouped = store.permissionsGroupedByResource()
			expect(grouped.size).toBe(2)
			expect(grouped.get('users')).toHaveLength(2)
			expect(grouped.get('roles')).toHaveLength(1)
		})

		it('should produce correct grouped array for templates', () => {
			const permissions = [
				createMockPermissionData({ id: 1, resource: 'users', action: 'read' }),
				createMockPermissionData({ id: 2, resource: 'roles', action: 'read', name: 'Read Roles' }),
				createMockPermissionData({ id: 3, resource: 'users', action: 'write', name: 'Write Users' }),
			]
			permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))
			setupStore()

			const groupedArray = store.permissionsGroupedArray()
			expect(groupedArray).toHaveLength(2)

			const usersGroup = groupedArray.find((g) => g.resource === 'users')
			const rolesGroup = groupedArray.find((g) => g.resource === 'roles')
			expect(usersGroup?.permissions).toHaveLength(2)
			expect(rolesGroup?.permissions).toHaveLength(1)
		})

		it('should return false for isLoading after completed operations', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Error')))
			setupStore()

			expect(store.isLoading()).toBe(false)
		})
	})

	describe('clearErrors', () => {
		it('should clear the readError field', () => {
			permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Error')))
			setupStore()
			expect(store.readError().list).toBe('Failed to load permissions')
			expect(store.hasReadError()).toBe(true)

			store.clearErrors()

			expect(store.readError().list).toBeNull()
			expect(store.hasReadError()).toBe(false)
		})
	})
})
