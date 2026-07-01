import { TestBed } from '@angular/core/testing'
import { UserStatus } from '@contracts/user/user.constants'
import type { CreateUserResponse } from '@contracts/user/user.types'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { UsersApi } from '@providers/users/users.interface'
import { createMockManagedUser } from '@providers/users/users.mock'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { EMPTY, NEVER, of, throwError } from 'rxjs'
import { UsersStore } from './users.store'

describe('UsersStore', () => {
	let store: InstanceType<typeof UsersStore>
	let usersApiMock: Record<keyof UsersApi, MockFn>

	/**
	 * Configures TestBed and injects the store.
	 * withHooks.onInit triggers loadUsers immediately, so getAll must be mocked
	 * before calling this. A default empty-list mock is set in beforeEach as a
	 * safety net — override it before calling setupStore() when needed.
	 */
	function setupStore(): void {
		TestBed.configureTestingModule({
			providers: [UsersStore, { provide: UsersApi, useValue: usersApiMock }],
		})
		store = TestBed.inject(UsersStore)
		TestBed.tick()
	}

	beforeEach(() => {
		clearAllMocks()

		usersApiMock = {
			getAll: fn(),
			getById: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			updateStatus: fn(),
			resetPassword: fn(),
		}

		// Default mock — prevents onInit from firing against an unmocked fn().
		// Tests that need a different initial response override before calling setupStore().
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
	})

	describe('initial state', () => {
		it('should start loading immediately via onInit', () => {
			usersApiMock.getAll.mockReturnValue(NEVER)
			setupStore()

			expect(store.users()).toEqual([])
			expect(store.selectedUser()).toBeNull()
			expect(store.currentPage()).toBe(1)
			expect(store.pageSize()).toBe(10)
			expect(store.totalItems()).toBe(0)
			expect(store.totalPages()).toBe(0)
			expect(store.searchQuery()).toBe('')
			expect(store.isLoadingList()).toBe(true)
			expect(store.isCreating()).toBe(false)
			expect(store.isUpdating()).toBe(false)
			expect(store.isDeleting()).toBe(false)
			expect(store.isResettingPassword()).toBe(false)
			expect(store.readError()).toEqual({ list: null, detail: null })
			expect(store.mutationError()).toEqual({
				create: null,
				update: null,
				updateStatus: null,
				delete: null,
				resetPassword: null,
			})
		})

		it('should have correct state after initial load completes', () => {
			setupStore()

			expect(store.users()).toEqual([])
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

	describe('loadUsers (reactive via onInit)', () => {
		it('should load users and update state on success', () => {
			const mockUser = createMockManagedUser()
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([mockUser], 1)))
			setupStore()

			expect(store.users()).toHaveLength(1)
			expect(store.users()[0].fullName).toBe('John Doe')
			expect(store.users()[0].status).toBe(UserStatus.ACTIVE)
			expect(store.totalItems()).toBe(1)
			expect(store.totalPages()).toBe(1)
			expect(store.isLoadingList()).toBe(false)
			expect(store.readError().list).toBeNull()
		})

		it('should send correct offset based on currentPage and pageSize', () => {
			setupStore()

			// setPage triggers reactive re-fetch via listParams signal change
			store.setPage(3)
			TestBed.tick()

			const lastCall = usersApiMock.getAll.calls[usersApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual({ offset: 20, limit: 10, search: undefined })
		})

		it('should compute totalPages correctly', () => {
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			expect(store.totalPages()).toBe(3)
		})

		it('should set readError.list on failure', () => {
			usersApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))
			setupStore()

			expect(store.isLoadingList()).toBe(false)
			expect(store.readError().list).toBe('Failed to load users')
		})

		describe('with debounced search', () => {
			beforeEach(() => useFakeTimers())
			afterEach(() => useRealTimers())

			it('should pass search query when set', async () => {
				setupStore()

				store.setSearchQuery('admin')
				await advanceTimersByTimeAsync(300)
				TestBed.tick()

				const lastCall = usersApiMock.getAll.calls[usersApiMock.getAll.calls.length - 1]
				expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'admin' }))
			})
		})

		it('should not send search param when query is empty', () => {
			setupStore()

			const lastCall = usersApiMock.getAll.calls[usersApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual(expect.objectContaining({ search: undefined }))
		})

		it('should return totalPages 0 when total is 0', () => {
			setupStore()

			expect(store.totalPages()).toBe(0)
		})

		it('should set isLoadingList while request is in flight', () => {
			usersApiMock.getAll.mockReturnValue(NEVER)
			setupStore()

			expect(store.isLoadingList()).toBe(true)
			expect(store.isAnyLoading()).toBe(true)
		})
	})

	describe('createUser', () => {
		it('should reload the list from the server on success', () => {
			const existingUser = createMockManagedUser({ id: 1 })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([existingUser], 1)))
			setupStore()

			const newUser: CreateUserResponse = {
				...createMockManagedUser({ id: 2, email: 'new@example.com', firstName: 'New' }),
				passwordEmailSent: true,
			}
			usersApiMock.create.mockReturnValue(of(newUser))

			// After create, the store reloads — mock the server-authoritative response
			const reloadedUsers = [existingUser, createMockManagedUser({ id: 2, email: 'new@example.com' })]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(reloadedUsers, 2)))

			store.createUser({
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'User',
				mustChangePassword: true,
			})

			expect(store.users()).toHaveLength(2)
			expect(store.totalItems()).toBe(2)
			expect(store.isCreating()).toBe(false)
		})

		it('should set mutationError on failure', () => {
			setupStore()

			usersApiMock.create.mockReturnValue(throwError(() => new Error('Conflict')))

			store.createUser({
				email: 'fail@example.com',
				firstName: 'Fail',
				lastName: 'User',
				mustChangePassword: true,
			})

			expect(store.isCreating()).toBe(false)
			expect(store.mutationError().create).toBe('Failed to create user')
		})
	})

	describe('updateUser', () => {
		it('should reload the list from the server on success', () => {
			const user = createMockManagedUser({ id: 5, firstName: 'Old' })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()

			usersApiMock.update.mockReturnValue(of(createMockManagedUser({ id: 5, firstName: 'Updated' })))

			// After update, the store reloads — mock the server-authoritative response
			const reloadedUser = createMockManagedUser({ id: 5, firstName: 'Updated' })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([reloadedUser], 1)))

			store.updateUser({ id: 5, body: { firstName: 'Updated' } })

			expect(store.users()[0].firstName).toBe('Updated')
			expect(store.isUpdating()).toBe(false)
		})

		it('should refresh the selected user when it is the one being updated', () => {
			const user = createMockManagedUser({ id: 5, firstName: 'Old' })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()
			store.selectUser(store.users()[0])

			usersApiMock.update.mockReturnValue(of(createMockManagedUser({ id: 5, firstName: 'Updated' })))
			usersApiMock.getById.mockReturnValue(of(createMockManagedUser({ id: 5, firstName: 'Updated' })))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockManagedUser({ id: 5 })], 1)))

			store.updateUser({ id: 5, body: { firstName: 'Updated' } })

			expect(usersApiMock.getById.calls).toHaveLength(1)
			expect(usersApiMock.getById.calls[0][0]).toBe(5)
			expect(store.selectedUser()?.firstName).toBe('Updated')
		})

		it('should not refresh the selected user when a different user is updated', () => {
			const user = createMockManagedUser({ id: 5 })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()
			store.selectUser(store.users()[0])

			usersApiMock.update.mockReturnValue(of(createMockManagedUser({ id: 9 })))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))

			store.updateUser({ id: 9, body: { firstName: 'Other' } })

			expect(usersApiMock.getById.calls).toHaveLength(0)
		})

		it('should set mutationError on failure', () => {
			setupStore()

			usersApiMock.update.mockReturnValue(throwError(() => new Error('Not found')))

			store.updateUser({ id: 1, body: { firstName: 'Fail' } })

			expect(store.isUpdating()).toBe(false)
			expect(store.mutationError().update).toBe('Failed to update user')
		})
	})

	describe('deleteUser', () => {
		it('should reload the list from the server on success', () => {
			const users = [createMockManagedUser({ id: 1 }), createMockManagedUser({ id: 2 })]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users, 2)))
			setupStore()

			usersApiMock.delete.mockReturnValue(of(undefined))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockManagedUser({ id: 2 })], 1)))

			store.deleteUser(1)

			expect(store.users()).toHaveLength(1)
			expect(store.users()[0].id).toBe(2)
			expect(store.totalItems()).toBe(1)
			expect(store.isDeleting()).toBe(false)
		})

		it('should navigate to previous page when last item on current page is deleted', () => {
			const user = createMockManagedUser({ id: 10 })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 11)))
			setupStore()

			// Move to page 2 — triggers reactive re-fetch
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 11)))
			store.setPage(2)
			TestBed.tick()

			// Delete the only user on page 2 — patches currentPage to 1,
			// which triggers the reactive loadUsers chain automatically
			usersApiMock.delete.mockReturnValue(of(undefined))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 10)))

			store.deleteUser(10)
			TestBed.tick()

			expect(store.currentPage()).toBe(1)
		})

		it('should clear selectedUser when the deleted user is selected', () => {
			const user = createMockManagedUser({ id: 1 })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user, createMockManagedUser({ id: 2 })], 2)))
			setupStore()
			store.selectUser(store.users()[0])

			usersApiMock.delete.mockReturnValue(of(undefined))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockManagedUser({ id: 2 })], 1)))

			store.deleteUser(1)

			expect(store.selectedUser()).toBeNull()
		})

		it('should not clear selectedUser when a different user is deleted', () => {
			const users = [createMockManagedUser({ id: 1 }), createMockManagedUser({ id: 2 })]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users, 2)))
			setupStore()
			store.selectUser(store.users()[0])

			usersApiMock.delete.mockReturnValue(of(undefined))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockManagedUser({ id: 1 })], 1)))

			store.deleteUser(2)

			expect(store.selectedUser()?.id).toBe(1)
		})

		it('should set mutationError on failure', () => {
			setupStore()

			usersApiMock.delete.mockReturnValue(throwError(() => new Error('Forbidden')))

			store.deleteUser(1)

			expect(store.isDeleting()).toBe(false)
			expect(store.mutationError().delete).toBe('Failed to delete user')
		})
	})

	describe('resetPassword', () => {
		it('should reload the list from the server on success and clear the resetting flag', () => {
			const users = [createMockManagedUser({ id: 1 }), createMockManagedUser({ id: 2 })]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users, 2)))
			setupStore()

			usersApiMock.resetPassword.mockReturnValue(of({ message: 'Password reset successfully' }))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users, 2)))

			store.resetPassword(1)

			expect(store.isResettingPassword()).toBe(false)
			expect(store.mutationError().resetPassword).toBeNull()
			// loadUsers re-fired after success — getAll called again beyond the initial onInit load
			expect(usersApiMock.getAll.calls.length).toBeGreaterThan(1)
		})

		it('should set mutationError.resetPassword on failure', () => {
			setupStore()

			usersApiMock.resetPassword.mockReturnValue(throwError(() => new Error('Forbidden')))

			store.resetPassword(1)

			expect(store.isResettingPassword()).toBe(false)
			expect(store.mutationError().resetPassword).toBe('Failed to reset password')
		})
	})

	describe('updateUserStatus', () => {
		it('should reload the list from the server on success', () => {
			const user = createMockManagedUser({ id: 3, status: UserStatus.ACTIVE })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()

			usersApiMock.updateStatus.mockReturnValue(of(createMockManagedUser({ id: 3, status: UserStatus.DISABLED })))

			// After status update, the store reloads — mock the server-authoritative response
			const reloadedUser = createMockManagedUser({ id: 3, status: UserStatus.DISABLED })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([reloadedUser], 1)))

			store.updateUserStatus({ id: 3, body: { status: UserStatus.DISABLED } })

			expect(store.users()[0].status).toBe(UserStatus.DISABLED)
			expect(store.isUpdating()).toBe(false)
		})

		it('should refresh the selected user when its status is the one being updated', () => {
			const user = createMockManagedUser({ id: 3, status: UserStatus.ACTIVE })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()
			store.selectUser(store.users()[0])

			usersApiMock.updateStatus.mockReturnValue(of(createMockManagedUser({ id: 3, status: UserStatus.DISABLED })))
			usersApiMock.getById.mockReturnValue(of(createMockManagedUser({ id: 3, status: UserStatus.DISABLED })))
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([createMockManagedUser({ id: 3 })], 1)))

			store.updateUserStatus({ id: 3, body: { status: UserStatus.DISABLED } })

			expect(usersApiMock.getById.calls).toHaveLength(1)
			expect(store.selectedUser()?.status).toBe(UserStatus.DISABLED)
		})

		it('should set mutationError on failure', () => {
			setupStore()

			usersApiMock.updateStatus.mockReturnValue(throwError(() => new Error('Error')))

			store.updateUserStatus({ id: 1, body: { status: UserStatus.DISABLED } })

			expect(store.isUpdating()).toBe(false)
			expect(store.mutationError().updateStatus).toBe('Failed to update user status')
		})
	})

	describe('setPage', () => {
		it('should update currentPage and trigger loadUsers reactively', () => {
			setupStore()
			const callsBefore = usersApiMock.getAll.calls.length

			store.setPage(3)
			TestBed.tick()

			expect(store.currentPage()).toBe(3)
			expect(usersApiMock.getAll.calls).toHaveLength(callsBefore + 1)
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
			const callsBefore = usersApiMock.getAll.calls.length

			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
			store.setSearchQuery('a')
			await advanceTimersByTimeAsync(100)
			store.setSearchQuery('ad')
			await advanceTimersByTimeAsync(100)
			store.setSearchQuery('admin')
			await advanceTimersByTimeAsync(300)
			TestBed.tick()

			expect(store.searchQuery()).toBe('admin')
			expect(usersApiMock.getAll.calls).toHaveLength(callsBefore + 1)
			const lastCall = usersApiMock.getAll.calls[usersApiMock.getAll.calls.length - 1]
			expect(lastCall[0]).toEqual(expect.objectContaining({ search: 'admin' }))
		})
	})

	describe('selectUser', () => {
		it('should set selectedUser from loaded users', () => {
			const user = createMockManagedUser({ id: 7 })
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([user], 1)))
			setupStore()

			store.selectUser(store.users()[0])

			expect(store.selectedUser()?.id).toBe(7)
			expect(store.selectedUser()?.fullName).toBe('John Doe')
		})

		it('should clear selectedUser when passed null', () => {
			usersApiMock.getAll.mockReturnValue(EMPTY)
			setupStore()

			store.selectUser(null)

			expect(store.selectedUser()).toBeNull()
		})
	})

	describe('clearErrors', () => {
		it('should clear both readError and mutationError', () => {
			usersApiMock.getAll.mockReturnValue(throwError(() => new Error('List error')))
			setupStore()
			expect(store.readError().list).toBe('Failed to load users')

			usersApiMock.create.mockReturnValue(throwError(() => new Error('Create error')))
			store.createUser({
				email: 'fail@test.com',
				firstName: 'F',
				lastName: 'L',
				mustChangePassword: true,
			})
			expect(store.mutationError().create).toBe('Failed to create user')

			store.clearErrors()

			expect(store.readError()).toEqual({ list: null, detail: null })
			expect(store.mutationError()).toEqual({
				create: null,
				update: null,
				updateStatus: null,
				delete: null,
				resetPassword: null,
			})
		})
	})

	describe('computed signals', () => {
		it('should compute hasNextPage correctly', () => {
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			// Page 1 of 3 → hasNextPage = true
			expect(store.hasNextPage()).toBe(true)
			expect(store.hasPreviousPage()).toBe(false)
		})

		it('should compute hasPreviousPage correctly', () => {
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([], 25)))
			setupStore()

			store.setPage(2)
			TestBed.tick()

			expect(store.hasPreviousPage()).toBe(true)
		})

		it('should return false for isAnyLoading after all operations complete', () => {
			usersApiMock.getAll.mockReturnValue(throwError(() => new Error('Error')))
			setupStore()

			expect(store.isAnyLoading()).toBe(false)
		})
	})

	describe('reload', () => {
		it('should trigger a re-fetch with the same params via imperative call', () => {
			setupStore()
			const callsBefore = usersApiMock.getAll.calls.length

			store.reload()

			expect(usersApiMock.getAll.calls).toHaveLength(callsBefore + 1)
		})
	})

	describe('clearMutationError', () => {
		it('should clear only the specified mutation error key', () => {
			usersApiMock.getAll.mockReturnValue(EMPTY)
			usersApiMock.create.mockReturnValue(throwError(() => new Error('Create error')))
			usersApiMock.delete.mockReturnValue(throwError(() => new Error('Delete error')))
			setupStore()

			store.createUser({ email: 'a@b.com', firstName: 'A', lastName: 'B', mustChangePassword: true })
			store.deleteUser(1)
			expect(store.mutationError().create).toBe('Failed to create user')
			expect(store.mutationError().delete).toBe('Failed to delete user')

			store.clearMutationError('create')

			expect(store.mutationError().create).toBeNull()
			expect(store.mutationError().delete).toBe('Failed to delete user')
		})
	})

	describe('loadUser', () => {
		it('should load a single user into selectedUser', () => {
			const user = createMockManagedUser({ id: 5 })
			usersApiMock.getAll.mockReturnValue(EMPTY)
			usersApiMock.getById.mockReturnValue(of(user))
			setupStore()

			store.loadUser(5)

			expect(store.selectedUser()).not.toBeNull()
			expect(store.selectedUser()?.id).toBe(5)
			expect(store.isLoadingDetail()).toBe(false)
		})

		it('should set isLoadingDetail to true while loading', () => {
			usersApiMock.getAll.mockReturnValue(EMPTY)
			usersApiMock.getById.mockReturnValue(NEVER)
			setupStore()

			store.loadUser(5)

			expect(store.isLoadingDetail()).toBe(true)
		})

		it('should set readError.detail on failure', () => {
			usersApiMock.getAll.mockReturnValue(EMPTY)
			usersApiMock.getById.mockReturnValue(throwError(() => new Error('Not found')))
			setupStore()

			store.loadUser(999)

			expect(store.isLoadingDetail()).toBe(false)
			expect(store.readError().detail).toBe('Failed to load user')
		})
	})

	describe('isMutating', () => {
		it('should return true when isCreating is true', () => {
			usersApiMock.getAll.mockReturnValue(EMPTY)
			usersApiMock.create.mockReturnValue(NEVER)
			setupStore()

			store.createUser({ email: 'a@b.com', firstName: 'A', lastName: 'B', mustChangePassword: true })

			expect(store.isMutating()).toBe(true)
		})

		it('should return false when no mutations are active', () => {
			setupStore()

			expect(store.isMutating()).toBe(false)
		})
	})
})
