import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type { PaginatedResponse, PaginationParams } from '../../../interfaces'
import type {
	CreateRoleParams,
	ListRolesParams,
	PermissionData,
	RoleData,
	RoleRepository,
	UpdateRoleParams,
} from './interfaces'

export class InMemoryRoleRepository implements RoleRepository {
	private roles: Map<number, RoleData> = new Map()
	private rolesByCode: Map<string, RoleData> = new Map()
	private rolesByName: Map<string, RoleData> = new Map()
	private rolePermissions: Map<number, PermissionData[]> = new Map()
	private availablePermissions: Map<number, PermissionData> = new Map()
	private nextId = 1

	/**
	 * Add a role to the mock repository for testing.
	 */
	public addRole(role: RoleData): void {
		this.roles.set(role.id, role)
		this.rolesByCode.set(role.code, role)
		this.rolesByName.set(role.name, role)
	}

	/**
	 * Add permissions for a role.
	 */
	public addPermissionsForRole(roleId: number, permissions: PermissionData[]): void {
		this.rolePermissions.set(roleId, permissions)
	}

	/**
	 * Add available permissions that can be assigned to roles.
	 */
	public addAvailablePermission(permission: PermissionData): void {
		this.availablePermissions.set(permission.id, permission)
	}

	/**
	 * Clear all data from the mock repository.
	 */
	public clear(): void {
		this.roles.clear()
		this.rolesByCode.clear()
		this.rolesByName.clear()
		this.rolePermissions.clear()
		this.availablePermissions.clear()
		this.nextId = 1
	}

	public async findById(id: number): Promise<RoleData | null> {
		return this.roles.get(id) ?? null
	}

	public async findByCode(code: string): Promise<RoleData | null> {
		return this.rolesByCode.get(code) ?? null
	}

	public async findByName(name: string): Promise<RoleData | null> {
		return this.rolesByName.get(name) ?? null
	}

	public async findAll(params?: ListRolesParams): Promise<PaginatedResponse<RoleData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET

		let allRoles = Array.from(this.roles.values())

		if (params?.search && params.search.trim().length > 0) {
			const searchLower = params.search.trim().toLowerCase()
			allRoles = allRoles.filter(
				(r) =>
					r.name.toLowerCase().includes(searchLower) ||
					r.code.toLowerCase().includes(searchLower) ||
					(r.description?.toLowerCase().includes(searchLower) ?? false),
			)
		}

		const data = allRoles.slice(offset, offset + limit)

		return {
			data,
			total: allRoles.length,
			offset,
			limit,
		}
	}

	public async create(params: CreateRoleParams, actorId: number): Promise<RoleData> {
		void actorId
		const now = new Date()
		const role: RoleData = {
			id: this.nextId++,
			name: params.name,
			code: params.code,
			description: params.description ?? null,
			removable: true,
			createdAt: now,
			updatedAt: now,
		}

		this.roles.set(role.id, role)
		this.rolesByCode.set(role.code, role)
		this.rolesByName.set(role.name, role)

		return role
	}

	public async update(id: number, params: UpdateRoleParams, actorId: number): Promise<RoleData | null> {
		void actorId
		const existing = this.roles.get(id)
		if (!existing) {
			return null
		}

		// Remove old name from index if name is being updated
		if (params.name !== undefined && params.name !== existing.name) {
			this.rolesByName.delete(existing.name)
		}

		const updated: RoleData = {
			...existing,
			name: params.name ?? existing.name,
			description: params.description ?? existing.description,
			updatedAt: new Date(),
		}

		this.roles.set(id, updated)
		this.rolesByCode.set(updated.code, updated)
		this.rolesByName.set(updated.name, updated)

		return updated
	}

	public async delete(id: number, actorId: number): Promise<void> {
		void actorId
		const role = this.roles.get(id)
		if (role) {
			this.roles.delete(id)
			this.rolesByCode.delete(role.code)
			this.rolePermissions.delete(id)
		}
	}

	public async findPermissionsForRole(
		roleId: number,
		pagination?: PaginationParams,
	): Promise<PaginatedResponse<PermissionData>> {
		const limit = pagination?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = pagination?.offset ?? QUERY_DEFAULTS.OFFSET

		const allPermissions = this.rolePermissions.get(roleId) ?? []
		const data = allPermissions.slice(offset, offset + limit)

		return {
			data,
			total: allPermissions.length,
			offset,
			limit,
		}
	}

	public async findPermissionsByIds(ids: number[]): Promise<PermissionData[]> {
		if (ids.length === 0) {
			return []
		}

		return ids.map((id) => this.availablePermissions.get(id)).filter((p): p is PermissionData => p !== undefined)
	}

	public async assignPermissions(roleId: number, permissionIds: number[], actorId: number): Promise<void> {
		void actorId
		// Get permissions from available permissions
		const permissions = await this.findPermissionsByIds(permissionIds)
		this.rolePermissions.set(roleId, permissions)
	}

	public async removeAllPermissions(roleId: number): Promise<void> {
		this.rolePermissions.delete(roleId)
	}
}
