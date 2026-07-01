import type { UserStatus } from '@contracts/user/user.constants'

export interface IManagedUserRole {
	readonly id: number
	readonly name: string
	readonly code: string
	readonly description: string | null
	readonly removable: boolean
	readonly createdAt: Date | null
	readonly updatedAt: Date | null
}

export interface IManagedUser {
	readonly id: number
	readonly email: string
	readonly firstName: string
	readonly lastName: string
	readonly fullName: string
	readonly status: UserStatus
	readonly statusChangedAt: Date | null
	readonly statusChangedBy: number | null
	readonly deletedAt: Date | null
	readonly createdAt: Date | null
	readonly updatedAt: Date | null
	readonly roles: readonly IManagedUserRole[]
}
