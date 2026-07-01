import { computed, inject } from '@angular/core'
import type { SearchPaginationParams } from '@contracts/common/pagination.types'
import type { AssignPermissionsRequest } from '@contracts/role/role.types'
import type { IRole } from '@domain/access/role.interface'
import { mapRole, mapRoleFromData } from '@domain/access/role.mapper'
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { RolesApi } from '@providers/roles/roles.interface'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { extractErrorMessage } from '@resetshop/angular-core/store/extract-error-message'
import { parseDurationToMs } from '@resetshop/util'
import { catchError, debounceTime, EMPTY, pipe, switchMap, tap } from 'rxjs'
import { SEARCH_DEBOUNCE_DELAY } from '../store.constants'
import type {
	CreateRoleWithPermissionsRequest,
	RolesMutationError,
	RolesReadError,
	UpdateRoleWithPermissionsRequest,
} from './roles.types'
import { initialRolesState } from './roles.types'

function patchReadError(current: RolesReadError, key: keyof RolesReadError, value: string | null): RolesReadError {
	return { ...current, [key]: value }
}

function patchMutationError(
	current: RolesMutationError,
	key: keyof RolesMutationError,
	value: string | null,
): RolesMutationError {
	return { ...current, [key]: value }
}

/**
 * RolesStore - Signal Store for role management state
 *
 * Manages the role list, pagination, search, CRUD operations, and permission assignment.
 * Components inject this store directly for all role management operations.
 * Uses RolesApi for HTTP calls and mapRole for domain mapping.
 *
 * The list load is reactive: changing currentPage, pageSize, or searchQuery
 * automatically triggers a re-fetch via rxMethod watching the computed listParams signal.
 */
export const RolesStore = signalStore(
	{ providedIn: 'root' },
	withState(initialRolesState),
	withComputed((store) => ({
		totalPages: computed(() => (store.totalItems() === 0 ? 0 : Math.ceil(store.totalItems() / store.pageSize()))),
		isAnyLoading: computed(
			() =>
				store.isLoadingList() ||
				store.isLoadingAll() ||
				store.isLoadingDetail() ||
				store.isCreating() ||
				store.isUpdating() ||
				store.isDeleting() ||
				store.isAssigningPermissions(),
		),
		isMutating: computed(() => store.isCreating() || store.isUpdating() || store.isDeleting()),
		hasReadError: computed(() => Object.values(store.readError()).some((e) => e !== null)),
		hasMutationError: computed(() => Object.values(store.mutationError()).some((e) => e !== null)),
		/** Reactive params for list fetch — any change triggers loadRoles via rxMethod */
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
		const rolesApi = inject(RolesApi)
		const loggerService = inject(Logger)

		return {
			loadRoles: rxMethod<SearchPaginationParams>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoadingList: true,
							readError: patchReadError(store.readError(), 'list', null),
						}),
					),
					switchMap(({ offset, limit, search }) =>
						rolesApi.getAll({ offset, limit, search }).pipe(
							tap({
								next: (response) => {
									patchState(store, {
										roles: response.data.map(mapRoleFromData),
										totalItems: response.total,
										isLoadingList: false,
									})
								},
								error: (err) => {
									loggerService.error('RolesStore', 'loadRoles failed', err)
									patchState(store, {
										isLoadingList: false,
										readError: patchReadError(store.readError(), 'list', 'Failed to load roles'),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			loadRole: rxMethod<number>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoadingDetail: true,
							readError: patchReadError(store.readError(), 'detail', null),
						}),
					),
					switchMap((id) =>
						rolesApi.getByIdWithPermissions(id).pipe(
							tap({
								next: (response) => patchState(store, { selectedRole: mapRole(response), isLoadingDetail: false }),
								error: (err) => {
									loggerService.error('RolesStore', 'loadRole failed', err)
									patchState(store, {
										isLoadingDetail: false,
										readError: patchReadError(store.readError(), 'detail', 'Failed to load role'),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			loadAllRoles: rxMethod<void>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoadingAll: true,
							readError: patchReadError(store.readError(), 'all', null),
						}),
					),
					switchMap(() =>
						rolesApi.getAllUnpaginated().pipe(
							tap({
								next: (roles) => patchState(store, { allRoles: roles.map(mapRoleFromData), isLoadingAll: false }),
								error: (err) => {
									loggerService.error('RolesStore', 'loadAllRoles failed', err)
									patchState(store, {
										isLoadingAll: false,
										readError: patchReadError(store.readError(), 'all', 'Failed to load all roles'),
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

			selectRole(role: IRole | null): void {
				patchState(store, { selectedRole: role })
			},

			clearErrors(): void {
				patchState(store, {
					readError: { list: null, detail: null, all: null },
					mutationError: { create: null, update: null, delete: null, assignPermissions: null },
				})
			},

			clearMutationError(key: keyof RolesMutationError): void {
				patchState(store, {
					mutationError: patchMutationError(store.mutationError(), key, null),
				})
			},
		}
	}),
	// Mutation methods — all reload the list after success
	withMethods((store) => {
		const rolesApi = inject(RolesApi)
		const loggerService = inject(Logger)

		return {
			reload(): void {
				store.loadRoles(store.listParams())
			},

			deleteRole: rxMethod<number>(
				pipe(
					tap(() =>
						patchState(store, {
							isDeleting: true,
							mutationError: patchMutationError(store.mutationError(), 'delete', null),
						}),
					),
					switchMap((id) =>
						rolesApi.delete(id).pipe(
							tap({
								next: () => {
									if (store.selectedRole()?.id === id) {
										patchState(store, { selectedRole: null })
									}
									patchState(store, { isDeleting: false })

									// When the last item on a page is deleted, navigate to previous page.
									// Patching currentPage triggers the reactive loadRoles chain automatically.
									if (store.roles().length === 1 && store.currentPage() > 1) {
										patchState(store, { currentPage: store.currentPage() - 1 })
									} else {
										store.loadRoles(store.listParams())
									}
								},
								error: (err) => {
									loggerService.error('RolesStore', 'deleteRole failed', err)
									patchState(store, {
										isDeleting: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'delete',
											extractErrorMessage(err, 'Failed to delete role'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			assignPermissions: rxMethod<{ id: number; body: AssignPermissionsRequest }>(
				pipe(
					tap(() =>
						patchState(store, {
							isAssigningPermissions: true,
							mutationError: patchMutationError(store.mutationError(), 'assignPermissions', null),
						}),
					),
					switchMap(({ id, body }) =>
						rolesApi.assignPermissions(id, body).pipe(
							tap({
								next: () => {
									patchState(store, { isAssigningPermissions: false })
									store.loadRole(id)
								},
								error: (err) => {
									loggerService.error('RolesStore', 'assignPermissions failed', err)
									patchState(store, {
										isAssigningPermissions: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'assignPermissions',
											extractErrorMessage(err, 'Failed to assign permissions'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),
			createRoleWithPermissions: rxMethod<CreateRoleWithPermissionsRequest>(
				pipe(
					tap(() =>
						patchState(store, {
							isCreating: true,
							mutationError: patchMutationError(store.mutationError(), 'create', null),
						}),
					),
					switchMap(({ permissionIds, ...body }) =>
						rolesApi.create(body).pipe(
							switchMap((created) => {
								if (permissionIds.length === 0) {
									return [created]
								}
								return rolesApi.assignPermissions(created.id, { permissionIds }).pipe(switchMap(() => [created]))
							}),
							tap({
								next: () => {
									patchState(store, { isCreating: false })
									store.loadRoles(store.listParams())
								},
								error: (err) => {
									loggerService.error('RolesStore', 'createRoleWithPermissions failed', err)
									patchState(store, {
										isCreating: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'create',
											extractErrorMessage(err, 'Failed to create role'),
										),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			updateRoleWithPermissions: rxMethod<UpdateRoleWithPermissionsRequest>(
				pipe(
					tap(() =>
						patchState(store, {
							isUpdating: true,
							mutationError: patchMutationError(store.mutationError(), 'update', null),
						}),
					),
					switchMap(({ id, body, permissionIds }) =>
						rolesApi.update(id, body).pipe(
							switchMap((updated) => {
								if (permissionIds.length === 0) {
									return [updated]
								}
								return rolesApi.assignPermissions(id, { permissionIds }).pipe(switchMap(() => [updated]))
							}),
							tap({
								next: () => {
									patchState(store, { isUpdating: false })
									store.loadRoles(store.listParams())
									store.loadRole(id)
								},
								error: (err) => {
									loggerService.error('RolesStore', 'updateRoleWithPermissions failed', err)
									patchState(store, {
										isUpdating: false,
										mutationError: patchMutationError(
											store.mutationError(),
											'update',
											extractErrorMessage(err, 'Failed to update role'),
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
			store.loadRoles(store.listParams)
		},
	}),
)
