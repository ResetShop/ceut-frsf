import type { LoginResponse, MeResponse } from '@contracts/auth/auth.types'
import { mapRole } from '../access/role.mapper'
import type { IUser } from '../user/user.interface'
import { createUser } from '../user/user.mapper'

/**
 * Maps a login response to an IUser. The login endpoint returns the full roles +
 * permissions payload, so `currentUser` is fully populated in a single round-trip —
 * no empty-roles window between login and the first `/api/auth/me` call.
 */
export function mapLoginResponseToUser(response: LoginResponse): IUser {
	return createUser({
		id: response.user.id,
		email: response.user.email,
		firstName: response.user.firstName,
		lastName: response.user.lastName,
		roles: response.user.roles.map(mapRole),
	})
}

/**
 * Maps a `/api/auth/me` response to an IUser. Used by `validateSession()` on protected
 * route activation to revalidate the session and refresh the user.
 */
export function mapMeResponseToUser(response: MeResponse): IUser {
	return createUser({
		id: response.id,
		email: response.email,
		firstName: response.firstName,
		lastName: response.lastName,
		roles: response.roles.map(mapRole),
	})
}
