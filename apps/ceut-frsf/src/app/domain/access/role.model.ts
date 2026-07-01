import type { IPermission } from './permission.interface'
import type { IRole } from './role.interface'

export class Role implements IRole {
	public readonly id: number
	public readonly code: string
	public readonly name: string
	public readonly description: string | null
	public readonly removable: boolean
	public readonly createdAt: Date | null
	public readonly updatedAt: Date | null
	public readonly permissions: readonly IPermission[]

	private readonly _permissionIdentifiers: ReadonlySet<string>

	constructor(
		id: number,
		code: string,
		name: string,
		description: string | null,
		removable: boolean,
		createdAt: Date | null,
		updatedAt: Date | null,
		permissions: readonly IPermission[],
	) {
		this.id = id
		this.code = code
		this.name = name
		this.description = description
		this.removable = removable
		this.createdAt = createdAt
		this.updatedAt = updatedAt
		this.permissions = permissions
		this._permissionIdentifiers = new Set(permissions.map((p) => p.identifier))
	}

	public hasPermission(identifier: string): boolean {
		return this._permissionIdentifiers.has(identifier)
	}
}
