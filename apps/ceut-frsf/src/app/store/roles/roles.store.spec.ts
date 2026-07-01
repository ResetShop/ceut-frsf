import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { RolesApi } from '@providers/roles/roles.interface'
import { createMockRoleData, createMockRoleWithPermissions } from '@providers/roles/roles.mock'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { NEVER, of, throwError } from 'rxjs'
import { RolesStore } from './roles.store'

describe('RolesStore', () => {
	let store: InstanceType<typeof RolesStore>
	let rolesApiMock: Record<keyof RolesApi, MockFn>

	/**
	 * Configures TestBed and injects the store.
	 * withHooks.onInit triggers loadRoles immediately, so getAll must be mocked
	 * before calling this. A default empty-list mock is set in beforeEach as a
	 * safety net — override it before calling setupStore() when needed.
	 */
	function setupStore(): void {
		TestBed.configureTestingModule({
			providers: [RolesStore, { provide: RolesApi, useValue: rolesApiMock }],
		})
		store = TestBed.inject(RolesStore)
		TestBed.tick()
	}

	beforeEach(() => {
		clearAllMocks()

		rolesApiMock = {
			getAll: fn(),
			getAllUnpaginated: fn(),
			getByIdWithPermissions: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			assignPermissions: fn(),
		}

		// Default mock — prevents onInit from firing against an unmocked fn().
		// Tests that need a different initial response override before calling setupStore().
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
	})

	describe('initial state', () => {
		it('should start loading immediately via onInit', () => {
			rolesApiMock.getAll.mockReturnValue(NEVER)
			setupStore()

			expect(store.roles()).toEqual([])
			expect(store.allRoles()).toEqual([])
			expect(store.selectedRole()).toBeNull()
			expect(store.currentPage()).toBe(1)
			expect(store.pageSize()).toBe(10)
			expect(store.totalItems()).toBe(0)
			expect(store.totalPages()).toBe(0)
			expect(store.searchQuery()).toBe('')
			expect(store.isLoadingList()).toBe(true)
			expect(store.isLoadingAll()).toBe(false)
			expect(store.isLoadingDetail()).toBe(false)
			expect(store.isCreating()).toBe(false)
			expect(store.isUpdating()).toBe(false)
			expect(store.isDeleting()).toBe(false)
			expect(store.isAssigningPermissions()).toBe(false)
			expect(store.readError()).toEqual({ list: null, detail: null, all: null })
			expect(store.mutationError()).toEqual({ create: null, update: null, delete: null, assignPermissions: null })
		})

		it('should have correct state after initial load completes', () => {
			setupStore()

			expect(store.roles()).toEqual([])
			expect(store.isLoadingList()).toBe(false)
			expect(store.readError().list).toBeNull()
		})

		it('should have correct computed signals', () => {
			setupStore()

			expect(store.hasNextPage()).toBe(false)
			expect(store.hasPreviousPage()).toBe(false)
			expect(store.isAnyLoading()).toBe(false)
		})
	})

	describe('loadRoles', () => {
		it('should load roles and update state on success', () => {
			const mockRole = createMockRoleData()
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([mockRole], 1)))
			setupStore()

			expect(store.roles()).toHaveLength(1)
			expect(store.roles()[0].name).toBe('Admin')
			expect(store.roles()[0].code).toBe('admin')
			expect(store.totalItems()).toBe(1)
			expect(store.totalPages()).toBe(1)
			expect(store.isLoadingList()).toBe(false)
			expect(store.readError().list).toBeNull()
		})

		it('should send correct offset based on currentPage and pageSize', () => {
			setupStore()

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 0)))
			store.setPage(3)
			TestBed.tick()

			const lastCall = rolesApiMock.getAll.calls[rolesApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual({ offset: 20, limit: 10, search: undefined })
		})

		it('should compute totalPages correctly', () => {
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			expect(store.totalPages()).toBe(3)
		})

		it('should set readError.list on failure', () => {
			rolesApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))
			setupStore()

			expect(store.isLoadingList()).toBe(false)
			expect(store.readError().list).toBe('Failed to load roles')
		})

		it('should pass search query when set', async () => {
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
			useFakeTimers()
			try {
				setupStore()

				rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
				store.setSearchQuery('admin')
				await advanceTimersByTimeAsync(300)
				TestBed.tick()

				const lastCall = rolesApiMock.getAll.calls[rolesApiMock.getAll.calls.length - 1]
				expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'admin' }))
			} finally {
				useRealTimers()
			}
		})

		it('should not send search param when query is empty', () => {
			setupStore()

			const lastCall = rolesApiMock.getAll.calls[rolesApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual(expect.objectContaining({ search: undefined }))
		})

		it('should set isLoadingList while request is in flight', () => {
			rolesApiMock.getAll.mockReturnValue(NEVER)
			setupStore()

			expect(store.isLoadingList()).toBe(true)
			expect(store.isAnyLoading()).toBe(true)
		})
	})

	describe('loadAllRoles', () => {
		it('should load all roles and update allRoles state', () => {
			setupStore()

			const roles = [createMockRoleData({ id: 1 }), createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })]
			rolesApiMock.getAllUnpaginated.mockReturnValue(of(roles))

			store.loadAllRoles()

			expect(store.allRoles()).toHaveLength(2)
			expect(store.isLoadingAll()).toBe(false)
		})

		it('should set isLoadingAll during load', () => {
			setupStore()

			rolesApiMock.getAllUnpaginated.mockReturnValue(NEVER)

			store.loadAllRoles()

			expect(store.isLoadingAll()).toBe(true)
		})

		it('should set readError.all on failure', () => {
			setupStore()

			rolesApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Error')))

			store.loadAllRoles()

			expect(store.isLoadingAll()).toBe(false)
			expect(store.readError().all).toBe('Failed to load all roles')
		})
	})

	describe('loadRole', () => {
		it('should load role with permissions and set selectedRole', () => {
			setupStore()

			const roleWithPerms = createMockRoleWithPermissions()
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))

			store.loadRole(1)

			const selected = store.selectedRole()
			expect(selected).not.toBeNull()
			expect(selected?.id).toBe(1)
			expect(selected?.name).toBe('Admin')
			expect(selected?.permissions).toHaveLength(1)
			expect(selected?.hasPermission('admin:users:read')).toBe(true)
			expect(store.isLoadingDetail()).toBe(false)
		})

		it('should set isLoadingDetail during load', () => {
			setupStore()

			rolesApiMock.getByIdWithPermissions.mockReturnValue(NEVER)

			store.loadRole(1)

			expect(store.isLoadingDetail()).toBe(true)
		})

		it('should set readError.detail on failure', () => {
			setupStore()

			rolesApiMock.getByIdWithPermissions.mockReturnValue(throwError(() => new Error('Not found')))

			store.loadRole(999)

			expect(store.isLoadingDetail()).toBe(false)
			expect(store.readError().detail).toBe('Failed to load role')
		})
	})

	describe('createRoleWithPermissions', () => {
		it('should reload the list from the server on success', () => {
			const existingRole = createMockRoleData({ id: 1 })
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([existingRole], 1)))
			setupStore()

			const newRole = createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })
			rolesApiMock.create.mockReturnValue(of(newRole))

			// After create, the store reloads — mock the server-authoritative response
			const reloadedRoles = [existingRole, createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })]
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(reloadedRoles, 2)))

			store.createRoleWithPermissions({ name: 'Editor', code: 'editor', permissionIds: [] })

			expect(store.roles()).toHaveLength(2)
			expect(store.totalItems()).toBe(2)
			expect(store.isCreating()).toBe(false)
		})

		it('should set mutationError.create on failure', () => {
			setupStore()

			rolesApiMock.create.mockReturnValue(throwError(() => new Error('Conflict')))

			store.createRoleWithPermissions({ name: 'Fail', code: 'fail', permissionIds: [] })

			expect(store.isCreating()).toBe(false)
			expect(store.mutationError().create).toBe('Failed to create role')
		})
	})

	describe('updateRoleWithPermissions', () => {
		it('should reload the list from the server on success', () => {
			const role = createMockRoleData({ id: 5, name: 'Old Name' })
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([role], 1)))
			setupStore()

			rolesApiMock.update.mockReturnValue(of(createMockRoleData({ id: 5, name: 'Updated Name' })))
			rolesApiMock.getAll.mockReturnValue(
				of(createPaginatedResponse([createMockRoleData({ id: 5, name: 'Updated Name' })], 1)),
			)
			rolesApiMock.getByIdWithPermissions.mockReturnValue(
				of(createMockRoleWithPermissions({ id: 5, name: 'Updated Name' })),
			)

			store.updateRoleWithPermissions({ id: 5, body: { name: 'Updated Name' }, permissionIds: [] })

			expect(store.roles()[0].name).toBe('Updated Name')
			expect(store.isUpdating()).toBe(false)
		})

		it('should reload detail when the updated role is selected', () => {
			const role = createMockRoleData({ id: 5 })
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([role], 1)))
			setupStore()

			// Load role detail to set selectedRole
			const roleWithPerms = createMockRoleWithPermissions({ id: 5 })
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))
			store.loadRole(5)

			rolesApiMock.update.mockReturnValue(of(createMockRoleData({ id: 5, name: 'Updated' })))
			rolesApiMock.getAll.mockReturnValue(
				of(createPaginatedResponse([createMockRoleData({ id: 5, name: 'Updated' })], 1)),
			)
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(createMockRoleWithPermissions({ id: 5, name: 'Updated' })))

			store.updateRoleWithPermissions({ id: 5, body: { name: 'Updated' }, permissionIds: [] })

			const detailCalls = rolesApiMock.getByIdWithPermissions.calls
			expect(detailCalls.length).toBeGreaterThanOrEqual(2)
			expect(detailCalls[detailCalls.length - 1][0]).toBe(5)
		})

		it('should set mutationError.update on failure', () => {
			setupStore()

			rolesApiMock.update.mockReturnValue(throwError(() => new Error('Not found')))

			store.updateRoleWithPermissions({ id: 1, body: { name: 'Fail' }, permissionIds: [] })

			expect(store.isUpdating()).toBe(false)
			expect(store.mutationError().update).toBe('Failed to update role')
		})
	})

	describe('deleteRole', () => {
		it('should reload the list from the server on success', () => {
			const roles = [createMockRoleData({ id: 1 }), createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })]
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles, 2)))
			setupStore()

			rolesApiMock.delete.mockReturnValue(of(undefined))
			rolesApiMock.getAll.mockReturnValue(
				of(createPaginatedResponse([createMockRoleData({ id: 2, name: 'Editor', code: 'editor' })], 1)),
			)

			store.deleteRole(1)

			expect(store.roles()).toHaveLength(1)
			expect(store.roles()[0].id).toBe(2)
			expect(store.totalItems()).toBe(1)
			expect(store.isDeleting()).toBe(false)
		})

		it('should clear selectedRole when the deleted role is selected', () => {
			const role = createMockRoleData({ id: 1 })
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([role, createMockRoleData({ id: 2 })], 2)))
			setupStore()

			const roleWithPerms = createMockRoleWithPermissions({ id: 1 })
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))
			store.loadRole(1)

			rolesApiMock.delete.mockReturnValue(of(undefined))
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockRoleData({ id: 2 })], 1)))

			store.deleteRole(1)

			expect(store.selectedRole()).toBeNull()
		})

		it('should not clear selectedRole when a different role is deleted', () => {
			const roles = [createMockRoleData({ id: 1 }), createMockRoleData({ id: 2 })]
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles, 2)))
			setupStore()

			const roleWithPerms = createMockRoleWithPermissions({ id: 1 })
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))
			store.loadRole(1)

			rolesApiMock.delete.mockReturnValue(of(undefined))
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockRoleData({ id: 1 })], 1)))

			store.deleteRole(2)

			expect(store.selectedRole()?.id).toBe(1)
		})

		it('should navigate to previous page when last item on current page is deleted', () => {
			const role = createMockRoleData({ id: 10 })
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([role], 11)))
			setupStore()

			// Move to page 2 — triggers reactive re-fetch
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([role], 11)))
			store.setPage(2)
			TestBed.tick()

			// Delete the only role on page 2 — patches currentPage to 1,
			// which triggers the reactive loadRoles chain automatically
			rolesApiMock.delete.mockReturnValue(of(undefined))
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 10)))

			store.deleteRole(10)
			TestBed.tick()

			expect(store.currentPage()).toBe(1)
		})

		it('should set mutationError.delete on failure', () => {
			setupStore()

			rolesApiMock.delete.mockReturnValue(throwError(() => new Error('Forbidden')))

			store.deleteRole(1)

			expect(store.isDeleting()).toBe(false)
			expect(store.mutationError().delete).toBe('Failed to delete role')
		})
	})

	describe('assignPermissions', () => {
		it('should reload role detail after successful assignment', () => {
			setupStore()

			const roleWithPerms = createMockRoleWithPermissions({ id: 5 })
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))
			store.loadRole(5)

			rolesApiMock.assignPermissions.mockReturnValue(of(undefined))
			// Re-mock for the detail reload after assignment
			const updatedPerms = createMockRoleWithPermissions({
				id: 5,
				permissions: [
					{ id: 1, name: 'Read Users', description: null, module: 'admin', resource: 'users', action: 'read' },
					{ id: 2, name: 'Write Users', description: null, module: 'admin', resource: 'users', action: 'write' },
				],
			})
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(updatedPerms))

			store.assignPermissions({ id: 5, body: { permissionIds: [1, 2] } })

			expect(store.isAssigningPermissions()).toBe(false)
			// Verify detail was reloaded
			const detailCalls = rolesApiMock.getByIdWithPermissions.calls
			expect(detailCalls.length).toBeGreaterThanOrEqual(2)
		})

		it('should set isAssigningPermissions during assignment', () => {
			setupStore()

			rolesApiMock.assignPermissions.mockReturnValue(NEVER)

			store.assignPermissions({ id: 5, body: { permissionIds: [1] } })

			expect(store.isAssigningPermissions()).toBe(true)
		})

		it('should set mutationError.assignPermissions on failure', () => {
			setupStore()

			rolesApiMock.assignPermissions.mockReturnValue(throwError(() => new Error('Bad request')))

			store.assignPermissions({ id: 5, body: { permissionIds: [999] } })

			expect(store.isAssigningPermissions()).toBe(false)
			expect(store.mutationError().assignPermissions).toBe('Failed to assign permissions')
		})
	})

	describe('setPage', () => {
		it('should update currentPage and trigger reactive re-fetch', () => {
			setupStore()
			const callsBefore = rolesApiMock.getAll.calls.length

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
			store.setPage(3)
			TestBed.tick()

			expect(store.currentPage()).toBe(3)
			expect(rolesApiMock.getAll.calls).toHaveLength(callsBefore + 1)
		})
	})

	describe('setPageSize', () => {
		it('should reset to page 1 and update pageSize', () => {
			setupStore()

			store.setPage(3)
			TestBed.tick()

			store.setPageSize(25)
			TestBed.tick()

			expect(store.currentPage()).toBe(1)
			expect(store.pageSize()).toBe(25)
		})
	})

	describe('setSearchQuery', () => {
		beforeEach(() => useFakeTimers())
		afterEach(() => useRealTimers())

		it('should not update searchQuery before debounce period elapses', async () => {
			setupStore()

			store.setSearchQuery('test')
			await advanceTimersByTimeAsync(299)

			expect(store.searchQuery()).toBe('')
		})

		it('should update searchQuery after debounce period elapses', async () => {
			setupStore()

			store.setSearchQuery('test')
			await advanceTimersByTimeAsync(300)

			expect(store.searchQuery()).toBe('test')
		})

		it('should reset to page 1 when search query is applied', async () => {
			setupStore()

			store.setPage(3)
			TestBed.tick()

			store.setSearchQuery('test')
			await advanceTimersByTimeAsync(300)

			expect(store.currentPage()).toBe(1)
			expect(store.searchQuery()).toBe('test')
		})

		it('should only apply the last value when called rapidly', async () => {
			setupStore()
			const callsBefore = rolesApiMock.getAll.calls.length

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
			store.setSearchQuery('a')
			await advanceTimersByTimeAsync(100)
			store.setSearchQuery('ad')
			await advanceTimersByTimeAsync(100)
			store.setSearchQuery('admin')
			await advanceTimersByTimeAsync(300)
			TestBed.tick()

			expect(store.searchQuery()).toBe('admin')
			// Only one API call should have been made (for the final debounced value)
			expect(rolesApiMock.getAll.calls).toHaveLength(callsBefore + 1)
			const lastCall = rolesApiMock.getAll.calls[rolesApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'admin' }))
		})

		it('should trigger a re-fetch after debounce', async () => {
			setupStore()
			const callsBefore = rolesApiMock.getAll.calls.length

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
			store.setSearchQuery('editor')
			await advanceTimersByTimeAsync(300)
			TestBed.tick()

			expect(rolesApiMock.getAll.calls).toHaveLength(callsBefore + 1)
		})
	})

	describe('selectRole', () => {
		it('should set selectedRole from loaded role', () => {
			setupStore()

			const roleWithPerms = createMockRoleWithPermissions({ id: 7 })
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of(roleWithPerms))
			store.loadRole(7)

			expect(store.selectedRole()?.id).toBe(7)
			expect(store.selectedRole()?.name).toBe('Admin')
		})

		it('should clear selectedRole when passed null', () => {
			setupStore()

			store.selectRole(null)

			expect(store.selectedRole()).toBeNull()
		})
	})

	describe('clearErrors', () => {
		it('should clear both readError and mutationError', () => {
			rolesApiMock.getAll.mockReturnValue(throwError(() => new Error('List error')))
			setupStore()
			expect(store.readError().list).toBe('Failed to load roles')

			rolesApiMock.create.mockReturnValue(throwError(() => new Error('Create error')))
			store.createRoleWithPermissions({ name: 'Fail', code: 'fail', permissionIds: [] })
			expect(store.mutationError().create).toBe('Failed to create role')

			store.clearErrors()

			expect(store.readError()).toEqual({ list: null, detail: null, all: null })
			expect(store.mutationError()).toEqual({ create: null, update: null, delete: null, assignPermissions: null })
		})
	})

	describe('clearMutationError', () => {
		it('should clear only the specified mutation error key', () => {
			setupStore()

			rolesApiMock.create.mockReturnValue(throwError(() => new Error('Create error')))
			store.createRoleWithPermissions({ name: 'Fail', code: 'fail', permissionIds: [] })

			rolesApiMock.delete.mockReturnValue(throwError(() => new Error('Delete error')))
			store.deleteRole(1)

			expect(store.mutationError().create).toBe('Failed to create role')
			expect(store.mutationError().delete).toBe('Failed to delete role')

			store.clearMutationError('create')

			expect(store.mutationError().create).toBeNull()
			expect(store.mutationError().delete).toBe('Failed to delete role')
		})
	})

	describe('backend error extraction', () => {
		it('should extract error message from HttpErrorResponse', () => {
			setupStore()

			const httpError = new HttpErrorResponse({
				error: { error: 'A role with this code already exists' },
				status: 409,
			})
			rolesApiMock.create.mockReturnValue(throwError(() => httpError))

			store.createRoleWithPermissions({ name: 'Duplicate', code: 'dup', permissionIds: [] })

			expect(store.mutationError().create).toBe('A role with this code already exists')
		})

		it('should use fallback message for non-HttpErrorResponse errors', () => {
			setupStore()

			rolesApiMock.create.mockReturnValue(throwError(() => new Error('Network error')))

			store.createRoleWithPermissions({ name: 'Fail', code: 'fail', permissionIds: [] })

			expect(store.mutationError().create).toBe('Failed to create role')
		})

		it('should use fallback when HttpErrorResponse has no error.error string', () => {
			setupStore()

			const httpError = new HttpErrorResponse({ error: null, status: 500 })
			rolesApiMock.create.mockReturnValue(throwError(() => httpError))

			store.createRoleWithPermissions({ name: 'Fail', code: 'fail', permissionIds: [] })

			expect(store.mutationError().create).toBe('Failed to create role')
		})

		it('should extract backend error for updateRoleWithPermissions', () => {
			setupStore()

			const httpError = new HttpErrorResponse({
				error: { error: 'Cannot remove your own admin permission' },
				status: 403,
			})
			rolesApiMock.update.mockReturnValue(throwError(() => httpError))

			store.updateRoleWithPermissions({ id: 1, body: { name: 'Test' }, permissionIds: [] })

			expect(store.mutationError().update).toBe('Cannot remove your own admin permission')
		})

		it('should extract backend error for deleteRole', () => {
			setupStore()

			const httpError = new HttpErrorResponse({
				error: { error: 'Cannot delete role with active users' },
				status: 409,
			})
			rolesApiMock.delete.mockReturnValue(throwError(() => httpError))

			store.deleteRole(1)

			expect(store.mutationError().delete).toBe('Cannot delete role with active users')
		})

		it('should extract backend error for assignPermissions', () => {
			setupStore()

			const httpError = new HttpErrorResponse({
				error: { error: 'Permission not found' },
				status: 404,
			})
			rolesApiMock.assignPermissions.mockReturnValue(throwError(() => httpError))

			store.assignPermissions({ id: 1, body: { permissionIds: [999] } })

			expect(store.mutationError().assignPermissions).toBe('Permission not found')
		})
	})

	describe('reload', () => {
		it('should imperatively re-fetch with current params', () => {
			setupStore()
			const callsBefore = rolesApiMock.getAll.calls.length

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockRoleData()], 1)))
			store.reload()

			expect(rolesApiMock.getAll.calls).toHaveLength(callsBefore + 1)
			expect(store.roles()).toHaveLength(1)
		})
	})

	describe('computed signals', () => {
		it('should compute hasNextPage correctly', () => {
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			// Page 1 of 3 → hasNextPage = true
			expect(store.hasNextPage()).toBe(true)
			expect(store.hasPreviousPage()).toBe(false)
		})

		it('should compute hasPreviousPage correctly', () => {
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			store.setPage(2)
			TestBed.tick()

			expect(store.hasPreviousPage()).toBe(true)
		})

		it('should return false for isAnyLoading after all operations complete', () => {
			setupStore()

			expect(store.isAnyLoading()).toBe(false)
		})
	})
})
