import type { IRole } from '../access/role.interface'
import type { IUser } from './user.interface'
import { User } from './user.model'

interface CreateUserOptions {
	id: number
	email: string
	firstName: string
	lastName: string
	roles: IRole[]
}

export function createUser(options: CreateUserOptions): IUser {
	return new User(options.id, options.email, options.firstName, options.lastName, options.roles)
}
