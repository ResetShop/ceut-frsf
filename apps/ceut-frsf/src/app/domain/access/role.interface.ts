import type { IPermission } from './permission.interface'

export interface IRole {
	readonly id: number
	readonly code: string
	readonly name: string
	readonly description: string | null
	readonly removable: boolean
	readonly createdAt: Date | null
	readonly updatedAt: Date | null
	readonly permissions: readonly IPermission[]

	hasPermission(identifier: string): boolean
}
