import type { IPermission } from '../access/permission.interface'
import type { IRole } from '../access/role.interface'

export interface IUser {
	readonly id: number
	readonly email: string
	readonly firstName: string
	readonly lastName: string
	readonly fullName: string
	readonly roles: readonly IRole[]

	get permissions(): readonly IPermission[]

	hasPermission(identifier: string): boolean
	hasRole(code: string): boolean
}
