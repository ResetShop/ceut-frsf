import type { AuthUser } from '@contracts/user/user.types'
import type { UpdateOwnProfileParams, UserManagementRepository, UserRoleService } from './interfaces'
import { userManagementErrors } from './user-management.service'

interface UserProfileServiceDeps {
	userManagementRepository: UserManagementRepository
	userRoleService: UserRoleService
}

/**
 * Self-service profile updates: the authenticated user editing their own identity fields.
 * The target is always the caller, so authentication is the only authorization.
 */
export class UserProfileService {
	private readonly userManagementRepository: UserManagementRepository
	private readonly userRoleService: UserRoleService

	constructor({ userManagementRepository, userRoleService }: UserProfileServiceDeps) {
		this.userManagementRepository = userManagementRepository
		this.userRoleService = userRoleService
	}

	/**
	 * Updates the caller's own profile and records a profile-history entry.
	 *
	 * @param userId - The caller's primary key, taken from the session
	 * @param params - The profile fields to change
	 * @returns The updated user with roles and permissions, in the same shape as `GET /api/auth/me`
	 * @throws Error if the account no longer exists
	 */
	public async updateOwnProfile(userId: number, params: UpdateOwnProfileParams): Promise<AuthUser> {
		const updated = await this.userManagementRepository.update(userId, params, userId)
		if (!updated) {
			throw userManagementErrors.notFound(userId)
		}

		const roles = await this.userRoleService.getUserRolesWithPermissions(userId)
		return {
			id: updated.id,
			email: updated.email,
			firstName: updated.firstName,
			lastName: updated.lastName,
			roles,
		}
	}
}
