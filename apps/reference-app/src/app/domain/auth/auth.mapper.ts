import type { LoginResponse, MeResponse } from '@contracts/auth/auth.types'
import type { AuthUser } from '@contracts/user/user.types'
import { mapRole } from '../access/role.mapper'
import type { IUser } from '../user/user.interface'
import { createUser } from '../user/user.mapper'

/**
 * Maps an authenticated-user payload — the shape shared by login, `/api/auth/me` and
 * `PATCH /api/users/me` — to an IUser.
 */
export function mapAuthUserToUser(user: AuthUser): IUser {
	return createUser({
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles.map(mapRole),
	})
}

/**
 * Maps a login response to an IUser. The login endpoint returns the full roles +
 * permissions payload, so `currentUser` is fully populated in a single round-trip —
 * no empty-roles window between login and the first `/api/auth/me` call.
 */
export function mapLoginResponseToUser(response: LoginResponse): IUser {
	return mapAuthUserToUser(response.user)
}

/**
 * Maps a `/api/auth/me` response to an IUser. Used by `validateSession()` on protected
 * route activation to revalidate the session and refresh the user.
 */
export function mapMeResponseToUser(response: MeResponse): IUser {
	return mapAuthUserToUser(response)
}
