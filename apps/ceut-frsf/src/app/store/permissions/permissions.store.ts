import { computed, inject } from '@angular/core'
import type { IPermission } from '@domain/access/permission.interface'
import { createPermission } from '@domain/access/permission.mapper'
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { PermissionsApi } from '@providers/permissions/permissions.interface'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { catchError, EMPTY, filter, pipe, switchMap, tap } from 'rxjs'
import type { PermissionsReadError } from './permissions.types'
import { initialPermissionsState } from './permissions.types'

function patchReadError(
	current: PermissionsReadError,
	key: keyof PermissionsReadError,
	value: string | null,
): PermissionsReadError {
	return { ...current, [key]: value }
}

function groupPermissionsByResource(permissions: IPermission[]): Map<string, IPermission[]> {
	return permissions.reduce((grouped, permission) => {
		const existing = grouped.get(permission.resource) ?? []
		grouped.set(permission.resource, [...existing, permission])
		return grouped
	}, new Map<string, IPermission[]>())
}

/**
 * PermissionsStore - Signal Store for system permissions
 *
 * Read-only store for displaying system-defined permissions.
 * Supports caching (skip re-fetch after first load) and grouping by resource.
 * Uses rxMethod for reactive data fetching — onInit triggers the first load automatically.
 */
export const PermissionsStore = signalStore(
	{ providedIn: 'root' },
	withState(initialPermissionsState),
	withComputed((store) => ({
		hasReadError: computed(() => Object.values(store.readError()).some((e) => e !== null)),
	})),
	withComputed((store) => {
		const permissionsGroupedByResource = computed(() => groupPermissionsByResource(store.permissions()))

		return {
			permissionsGroupedByResource,
			permissionsGroupedArray: computed(() => {
				return Array.from(permissionsGroupedByResource().entries()).map(([resource, permissions]) => ({
					resource,
					permissions,
				}))
			}),
		}
	}),
	withMethods((store) => {
		const permissionsApi = inject(PermissionsApi)
		const loggerService = inject(Logger)

		return {
			loadPermissions: rxMethod<void>(
				pipe(
					filter(() => !store.isCached()),
					tap(() =>
						patchState(store, {
							isLoading: true,
							readError: patchReadError(store.readError(), 'list', null),
						}),
					),
					switchMap(() =>
						permissionsApi.getAllUnpaginated().pipe(
							tap({
								next: (data) =>
									patchState(store, { permissions: data.map(createPermission), isLoading: false, isCached: true }),
								error: (err) => {
									loggerService.error('PermissionsStore', 'loadPermissions failed', err)
									patchState(store, {
										isLoading: false,
										readError: patchReadError(store.readError(), 'list', 'Failed to load permissions'),
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			clearErrors(): void {
				patchState(store, { readError: { list: null } })
			},
		}
	}),
	// Second withMethods block — needs access to store.loadPermissions from the first block
	withMethods((store) => ({
		reload(): void {
			patchState(store, { isCached: false })
			store.loadPermissions()
		},
	})),
	withHooks({
		onInit(store) {
			// Imperative — no reactive params; cache guard in the filter() operator prevents redundant fetches
			store.loadPermissions()
		},
	}),
)
