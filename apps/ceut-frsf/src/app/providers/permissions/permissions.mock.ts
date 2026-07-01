import { makeEnvironmentProviders } from '@angular/core'
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
 * All 14 system permissions mirroring PERMISSIONS_SEED_DATA.
 * Grouped by resource: permissions (1), users (6), roles (4), user_roles (3).
 */
export const MOCK_PERMISSIONS: PermissionData[] = [
	createMockPermissionData({
		id: 1,
		name: 'admin:permissions:read',
		description: 'View all system permissions',
		module: 'admin',
		resource: 'permissions',
		action: 'read',
	}),
	createMockPermissionData({
		id: 2,
		name: 'admin:users:create',
		description: 'Create new users',
		module: 'admin',
		resource: 'users',
		action: 'create',
	}),
	createMockPermissionData({
		id: 3,
		name: 'admin:users:read',
		description: 'View user details',
		module: 'admin',
		resource: 'users',
		action: 'read',
	}),
	createMockPermissionData({
		id: 4,
		name: 'admin:users:update',
		description: 'Update user information',
		module: 'admin',
		resource: 'users',
		action: 'update',
	}),
	createMockPermissionData({
		id: 5,
		name: 'admin:users:delete',
		description: 'Delete users',
		module: 'admin',
		resource: 'users',
		action: 'delete',
	}),
	createMockPermissionData({
		id: 6,
		name: 'admin:users:reset_password',
		description: 'Reset user passwords',
		module: 'admin',
		resource: 'users',
		action: 'reset_password',
	}),
	createMockPermissionData({
		id: 7,
		name: 'admin:users:disable',
		description: 'Manage user account status',
		module: 'admin',
		resource: 'users',
		action: 'disable',
	}),
	createMockPermissionData({
		id: 8,
		name: 'admin:roles:create',
		description: 'Create new roles',
		module: 'admin',
		resource: 'roles',
		action: 'create',
	}),
	createMockPermissionData({
		id: 9,
		name: 'admin:roles:read',
		description: 'View role details',
		module: 'admin',
		resource: 'roles',
		action: 'read',
	}),
	createMockPermissionData({
		id: 10,
		name: 'admin:roles:update',
		description: 'Update roles',
		module: 'admin',
		resource: 'roles',
		action: 'update',
	}),
	createMockPermissionData({
		id: 11,
		name: 'admin:roles:delete',
		description: 'Delete roles',
		module: 'admin',
		resource: 'roles',
		action: 'delete',
	}),
	createMockPermissionData({
		id: 12,
		name: 'admin:user_roles:read',
		description: 'View user role assignments',
		module: 'admin',
		resource: 'user_roles',
		action: 'read',
	}),
	createMockPermissionData({
		id: 13,
		name: 'admin:user_roles:assign',
		description: 'Assign roles to users',
		module: 'admin',
		resource: 'user_roles',
		action: 'assign',
	}),
	createMockPermissionData({
		id: 14,
		name: 'admin:user_roles:remove',
		description: 'Remove roles from users',
		module: 'admin',
		resource: 'user_roles',
		action: 'remove',
	}),
]

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
