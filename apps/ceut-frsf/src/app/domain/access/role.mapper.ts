import type { PermissionData, RoleData, RoleWithPermissions } from '@contracts/role/role.types'
import type { IPermission } from './permission.interface'
import { createPermission } from './permission.mapper'
import type { IRole } from './role.interface'
import { Role } from './role.model'

export function mapPermission(data: PermissionData): IPermission {
	return createPermission({
		id: data.id,
		name: data.name,
		description: data.description,
		module: data.module,
		resource: data.resource,
		action: data.action,
	})
}

interface CreateRoleOptions {
	id: number
	code: string
	name: string
	description: string | null
	removable: boolean
	createdAt: Date | null
	updatedAt: Date | null
	permissions: IPermission[]
}

export function createRole(options: CreateRoleOptions): IRole {
	return new Role(
		options.id,
		options.code,
		options.name,
		options.description,
		options.removable,
		options.createdAt,
		options.updatedAt,
		options.permissions,
	)
}

export function mapRoleFromData(data: RoleData): IRole {
	return createRole({
		id: data.id,
		code: data.code,
		name: data.name,
		description: data.description,
		removable: data.removable,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		permissions: [],
	})
}

export function mapRole(data: RoleWithPermissions): IRole {
	const permissions = data.permissions.map(mapPermission)
	return createRole({
		id: data.id,
		code: data.code,
		name: data.name,
		description: data.description,
		removable: data.removable,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		permissions,
	})
}
