import { makeEnvironmentProviders } from '@angular/core'
import type { PaginatedResponse, SearchPaginationParams } from '@contracts/common/pagination.types'
import type {
	AssignPermissionsRequest,
	CreateRoleRequest,
	PermissionData,
	RoleData,
	RoleWithPermissions,
	UpdateRoleRequest,
} from '@contracts/role/role.types'
import type { Observable } from 'rxjs'
import { of, throwError } from 'rxjs'
import type { RolesApi } from './roles.interface'
import { RolesApi as RolesApiToken } from './roles.interface'

export function createMockRoleData(overrides: Partial<RoleData> = {}): RoleData {
	return {
		id: 1,
		name: 'Admin',
		code: 'admin',
		description: null,
		removable: true,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01'),
		...overrides,
	}
}

/**
 * Pre-built role list with diverse properties for pagination and search testing.
 * Includes the non-removable admin, plus 4 removable roles with varying descriptions.
 */
export const MOCK_ROLES: RoleData[] = [
	createMockRoleData({
		id: 1,
		name: 'Administrator',
		code: 'admin',
		description: 'System administrator with full access',
		removable: false,
	}),
	createMockRoleData({
		id: 2,
		name: 'Editor',
		code: 'editor',
		description: 'Can edit content and manage users',
		createdAt: new Date('2025-01-15'),
		updatedAt: new Date('2025-02-01'),
	}),
	createMockRoleData({
		id: 3,
		name: 'Viewer',
		code: 'viewer',
		description: 'Read-only access to all resources',
		createdAt: new Date('2025-01-15'),
		updatedAt: new Date('2025-01-15'),
	}),
	createMockRoleData({
		id: 4,
		name: 'User Manager',
		code: 'user_manager',
		description: 'Manages user accounts and roles',
		createdAt: new Date('2025-02-01'),
		updatedAt: new Date('2025-02-01'),
	}),
	createMockRoleData({
		id: 5,
		name: 'Auditor',
		code: 'auditor',
		description: null,
		createdAt: new Date('2025-03-01'),
		updatedAt: new Date('2025-03-01'),
	}),
]

export function createMockRoleWithPermissions(overrides: Partial<RoleWithPermissions> = {}): RoleWithPermissions {
	return {
		id: 1,
		code: 'admin',
		name: 'Admin',
		description: null,
		removable: true,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01'),
		permissions: [{ id: 1, name: 'Read Users', description: null, module: 'admin', resource: 'users', action: 'read' }],
		...overrides,
	}
}

export class InMemoryRolesApi implements RolesApi {
	private roles = new Map<number, RoleData>()
	private rolePermissions = new Map<number, PermissionData[]>()
	private errors = new Map<string, Error>()
	private nextId = 100

	public addRole(role: RoleData): void {
		this.roles.set(role.id, role)
	}

	public addRoleWithPermissions(role: RoleData, permissions: PermissionData[]): void {
		this.roles.set(role.id, role)
		this.rolePermissions.set(role.id, permissions)
	}

	public clear(): void {
		this.roles.clear()
		this.rolePermissions.clear()
		this.errors.clear()
	}

	public setError(method: keyof RolesApi, error: Error): void {
		this.errors.set(method, error)
	}

	public clearErrors(): void {
		this.errors.clear()
	}

	public getAll(params?: SearchPaginationParams): Observable<PaginatedResponse<RoleData>> {
		const error = this.errors.get('getAll')
		if (error) {
			return throwError(() => error)
		}

		let data = [...this.roles.values()]

		if (params?.search) {
			const search = params.search.toLowerCase()
			data = data.filter((r) => r.name.toLowerCase().includes(search) || r.code.toLowerCase().includes(search))
		}

		const total = data.length
		const offset = params?.offset ?? 0
		const limit = params?.limit ?? 10
		const page = data.slice(offset, offset + limit)

		return of({ data: page, total, offset, limit })
	}

	public getAllUnpaginated(): Observable<RoleData[]> {
		const error = this.errors.get('getAllUnpaginated')
		if (error) {
			return throwError(() => error)
		}

		return of([...this.roles.values()])
	}

	public getByIdWithPermissions(id: number): Observable<RoleWithPermissions> {
		const error = this.errors.get('getByIdWithPermissions')
		if (error) {
			return throwError(() => error)
		}

		const role = this.roles.get(id)
		if (!role) {
			return throwError(() => new Error(`Role ${id} not found`))
		}

		const permissions = this.rolePermissions.get(id) ?? []
		return of({ ...role, permissions })
	}

	public create(body: CreateRoleRequest): Observable<RoleData> {
		const error = this.errors.get('create')
		if (error) {
			return throwError(() => error)
		}

		const id = this.nextId++
		const role: RoleData = {
			id,
			name: body.name,
			code: body.code,
			description: body.description ?? null,
			removable: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		this.roles.set(id, role)
		return of(role)
	}

	public update(id: number, body: UpdateRoleRequest): Observable<RoleData> {
		const error = this.errors.get('update')
		if (error) {
			return throwError(() => error)
		}

		const role = this.roles.get(id)
		if (!role) {
			return throwError(() => new Error(`Role ${id} not found`))
		}

		const updated = { ...role, ...body, updatedAt: new Date() }
		this.roles.set(id, updated)
		return of(updated)
	}

	public delete(id: number): Observable<void> {
		const error = this.errors.get('delete')
		if (error) {
			return throwError(() => error)
		}

		this.roles.delete(id)
		this.rolePermissions.delete(id)
		return of(undefined)
	}

	public assignPermissions(id: number, body: AssignPermissionsRequest): Observable<void> {
		const error = this.errors.get('assignPermissions')
		if (error) {
			return throwError(() => error)
		}

		// REASON: Placeholder values — resource/action are irrelevant for assignment tests.
		// Use addRoleWithPermissions() to control full permission data.
		const permissions = body.permissionIds.map((pid) => ({
			id: pid,
			name: `Permission ${pid}`,
			description: null,
			module: 'admin',
			resource: 'unknown',
			action: 'unknown',
		}))
		this.rolePermissions.set(id, permissions)
		return of(undefined)
	}
}

export function provideRolesMock(api: InMemoryRolesApi = new InMemoryRolesApi()) {
	return makeEnvironmentProviders([{ provide: RolesApiToken, useValue: api }])
}
