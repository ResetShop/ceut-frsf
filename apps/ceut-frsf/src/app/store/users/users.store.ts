import { computed, inject } from '@angular/core'
import type { SearchPaginationParams } from '@contracts/common/pagination.types'
import type { CreateUserRequest, UpdateUserRequest, UpdateUserStatusRequest } from '@contracts/user/user.types'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { UsersApi } from '@providers/users/users.interface'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { extractErrorMessage } from '@resetshop/angular-core/store/extract-error-message'
import { parseDurationToMs } from '@resetshop/util'
import { catchError, debounceTime, EMPTY, pipe, switchMap, tap } from 'rxjs'
import { SEARCH_DEBOUNCE_DELAY } from '../store.constants'
import type { UsersMutationError, UsersReadError } from './users.types'
import { initialUsersState } from './users.types'

function patchReadError(current: UsersReadError, key: keyof UsersReadError, value: string | null): UsersReadError {
	return { ...current, [key]: value }
}

function patchMutationError(
	current: UsersMutationError,
	key: keyof UsersMutationError,
	value: string | null,
): UsersMutationError {
	return { ...current, [key]: value }
}

/**
 * UsersStore - Signal Store for user management state
 *
 * Manages the user list, pagination, search, and CRUD operations.
 * Components inject this store directly for all user management operations.
 * Uses UsersApi for HTTP calls and mapManagedUserResponse for domain mapping.
 *
 * The list load is reactive: changing currentPage, pageSize, or searchQuery
 * automatically triggers a re-fetch via rxMethod watching the computed listParams signal.
 */
export const UsersStore = signalStore(
	{ providedIn: 'root' },
	withState(initialUsersState),
	withComputed((store) => ({
		totalPages: computed(() => (store.totalItems() === 0 ? 0 : Math.ceil(store.totalItems() / store.pageSize()))),
		isAnyLoading: computed(
			() =>
				store.isLoadingList() ||
				store.isLoadingDetail() ||
				store.isCreating() ||
				store.isUpdating() ||
				store.isDeleting() ||
				store.isResettingPassword(),
		),
		hasReadError: computed(() => Object.values(store.readError()).some((e) => e !== null)),
		hasMutationError: computed(() => Object.values(store.mutationError()).some((e) => e !== null)),
		isMutating: computed(
			() => store.isCreating() || store.isUpdating() || store.isDeleting() || store.isResettingPassword(),
		),
		/** Reactive params for list fetch — any change triggers loadUsers via rxMethod */
		listParams: computed(() => ({
			offset: (store.currentPage() - 1) * store.pageSize(),
			limit: store.pageSize(),
			search: store.searchQuery() || undefined,
		})),
	})),
	withComputed((store) => ({
		hasNextPage: computed(() => store.currentPage() < store.totalPages()),
		hasPreviousPage: computed(() => store.currentPage() > 1),
	})),
	withMethods((store) => {
		const usersApi = inject(UsersApi)
		const loggerService = inject(Logger)

		return {
			loadUsers: rxMethod<SearchPaginationParams>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoadingList: true,
							readError: patchReadError(store.readError(), 'list', null),
						}),
					),
					switchMap(({ offset, limit, search }) =>
						usersApi.getAll({ offset, limit, search }).pipe(
							tap({
								next: (response) => {
									const users = response.data.map(mapManagedUserResponse)
									patchState(store, { users, totalItems: response.total, isLoadingList: false })
								},
								error: (err) => {
									loggerService.error('UsersStore', 'loadUsers failed', err)
									patchState(store, {
										isLoadingList: false,
										readError: patchReadError(store.readError(), 'list', 'Failed to load users'),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			setPage(page: number): void {
				patchState(store, { currentPage: page })
			},

			setPageSize(size: number): void {
				patchState(store, { pageSize: size, currentPage: 1 })
			},

			setSearchQuery: rxMethod<string>(
				pipe(
					debounceTime(parseDurationToMs(SEARCH_DEBOUNCE_DELAY)),
					tap((query: string) => patchState(store, { searchQuery: query, currentPage: 1 })),
				),
			),

			loadUser: rxMethod<number>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoadingDetail: true,
							readError: patchReadError(store.readError(), 'detail', null),
						}),
					),
					switchMap((id) =>
						usersApi.getById(id).pipe(
							tap({
								next: (response) =>
									patchState(store, {
										selectedUser: mapManagedUserResponse(response),
										isLoadingDetail: false,
									}),
								error: (err) => {
									loggerService.error('UsersStore', 'loadUser failed', err)
									patchState(store, {
										isLoadingDetail: false,
										readError: patchReadError(store.readError(), 'detail', 'Failed to load user'),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			selectUser(user: IManagedUser | null): void {
				patchState(store, { selectedUser: user })
			},

			clearMutationError(key: keyof UsersMutationError): void {
				patchState(store, { mutationError: patchMutationError(store.mutationError(), key, null) })
			},

			clearErrors(): void {
				patchState(store, {
					readError: { list: null, detail: null },
					mutationError: { create: null, update: null, updateStatus: null, delete: null, resetPassword: null },
				})
			},
		}
	}),
	// Mutation methods — all reload the list after success
	withMethods((store) => {
		const usersApi = inject(UsersApi)
		const loggerService = inject(Logger)

		return {
			reload(): void {
				store.loadUsers(store.listParams())
			},

			createUser: rxMethod<CreateUserRequest>(
				pipe(
					tap(() =>
						patchState(store, {
							isCreating: true,
							mutationError: patchMutationError(store.mutationError(), 'create', null),
						}),
					),
					switchMap((body) =>
						usersApi.create(body).pipe(
							tap({
								next: () => {
									patchState(store, { isCreating: false })
									store.loadUsers(store.listParams())
								},
								error: (err) => {
									loggerService.error('UsersStore', 'createUser failed', err)
									patchState(store, {
										isCreating: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'create',
											extractErrorMessage(err, 'Failed to create user'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			updateUser: rxMethod<{ id: number; body: UpdateUserRequest }>(
				pipe(
					tap(() =>
						patchState(store, {
							isUpdating: true,
							mutationError: patchMutationError(store.mutationError(), 'update', null),
						}),
					),
					switchMap(({ id, body }) =>
						usersApi.update(id, body).pipe(
							tap({
								next: () => {
									patchState(store, { isUpdating: false })
									// Refresh the detail view when the mutated user is the one being viewed, so its badge,
									// profile, and roles reflect the change (the list reload alone leaves the detail stale).
									if (store.selectedUser()?.id === id) {
										store.loadUser(id)
									}
									store.loadUsers(store.listParams())
								},
								error: (err) => {
									loggerService.error('UsersStore', 'updateUser failed', err)
									patchState(store, {
										isUpdating: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'update',
											extractErrorMessage(err, 'Failed to update user'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			updateUserStatus: rxMethod<{ id: number; body: UpdateUserStatusRequest }>(
				pipe(
					tap(() =>
						patchState(store, {
							isUpdating: true,
							mutationError: patchMutationError(store.mutationError(), 'updateStatus', null),
						}),
					),
					switchMap(({ id, body }) =>
						usersApi.updateStatus(id, body).pipe(
							tap({
								next: () => {
									patchState(store, { isUpdating: false })
									// Refresh the detail view when the mutated user is the one being viewed, so its badge,
									// profile, and roles reflect the change (the list reload alone leaves the detail stale).
									if (store.selectedUser()?.id === id) {
										store.loadUser(id)
									}
									store.loadUsers(store.listParams())
								},
								error: (err) => {
									loggerService.error('UsersStore', 'updateUserStatus failed', err)
									patchState(store, {
										isUpdating: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'updateStatus',
											extractErrorMessage(err, 'Failed to update user status'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			resetPassword: rxMethod<number>(
				pipe(
					tap(() =>
						patchState(store, {
							isResettingPassword: true,
							mutationError: patchMutationError(store.mutationError(), 'resetPassword', null),
						}),
					),
					switchMap((id) =>
						usersApi.resetPassword(id).pipe(
							tap({
								next: () => {
									patchState(store, { isResettingPassword: false })
									store.loadUsers(store.listParams())
								},
								error: (err) => {
									loggerService.error('UsersStore', 'resetPassword failed', err)
									patchState(store, {
										isResettingPassword: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'resetPassword',
											extractErrorMessage(err, 'Failed to reset password'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			deleteUser: rxMethod<number>(
				pipe(
					tap(() =>
						patchState(store, {
							isDeleting: true,
							mutationError: patchMutationError(store.mutationError(), 'delete', null),
						}),
					),
					switchMap((id) =>
						usersApi.delete(id).pipe(
							tap({
								next: () => {
									if (store.selectedUser()?.id === id) {
										patchState(store, { selectedUser: null })
									}
									patchState(store, { isDeleting: false })

									// When the last item on a page is deleted, navigate to previous page.
									// Patching currentPage triggers the reactive loadUsers chain automatically.
									if (store.users().length === 1 && store.currentPage() > 1) {
										patchState(store, { currentPage: store.currentPage() - 1 })
									} else {
										store.loadUsers(store.listParams())
									}
								},
								error: (err) => {
									loggerService.error('UsersStore', 'deleteUser failed', err)
									patchState(store, {
										isDeleting: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'delete',
											extractErrorMessage(err, 'Failed to delete user'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),
		}
	}),
	withHooks({
		onInit(store) {
			// Pass the computed listParams signal — rxMethod watches it and re-fires on any change
			store.loadUsers(store.listParams)
		},
	}),
)
