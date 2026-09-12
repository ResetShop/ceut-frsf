import { makeEnvironmentProviders } from '@angular/core'
import { PERMISSIONS_SEED_DATA } from '@contracts/permission/permission.constants'
import type { PermissionData } from '@contracts/role/role.types'
import type { Observable } from 'rxjs'
import { of, throwError } from 'rxjs'
import type { PermissionsApi } from './permissions.interface'
import { PermissionsApi as PermissionsApiToken } from './permissions.interface'

export function createMockPermissionData(overrides: Partial<PermissionData> = {}): PermissionData {
	return {
		id: 1,
		name: 'admin:users:read',
		description: null,
		module: 'admin',
		resource: 'users',
		action: 'read',
		...overrides,
	}
}

/**
 * The full system permission catalogue, derived from PERMISSIONS_SEED_DATA so a permission added
 * to the domain definitions is automatically available to tests instead of having to be restated
 * here. Ids are 1-based positions in that catalogue, matching how the seed script inserts them.
 */
export const MOCK_PERMISSIONS: PermissionData[] = PERMISSIONS_SEED_DATA.map((permission, index) =>
	createMockPermissionData({ ...permission, id: index + 1 }),
)

export class InMemoryPermissionsApi implements PermissionsApi {
	private permissions: PermissionData[] = []
	private errors = new Map<string, Error>()

	public addPermission(permission: PermissionData): void {
		this.permissions.push(permission)
	}

	public setPermissions(permissions: PermissionData[]): void {
		this.permissions = [...permissions]
	}

	public clear(): void {
		this.permissions = []
		this.errors.clear()
	}

	public setError(method: keyof PermissionsApi, error: Error): void {
		this.errors.set(method, error)
	}

	public clearErrors(): void {
		this.errors.clear()
	}

	public getAllUnpaginated(): Observable<PermissionData[]> {
		const error = this.errors.get('getAllUnpaginated')
		if (error) {
			return throwError(() => error)
		}

		return of([...this.permissions])
	}
}

export function providePermissionsMock(api: InMemoryPermissionsApi = new InMemoryPermissionsApi()) {
	return makeEnvironmentProviders([{ provide: PermissionsApiToken, useValue: api }])
}
