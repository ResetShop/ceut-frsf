export const USER_ROLE_ERRORS = {
	USER_NOT_FOUND: 'User not found',
	ROLE_NOT_FOUND: 'Role not found',
	ROLES_NOT_FOUND: 'Roles not found',
	ROLE_ALREADY_ASSIGNED: 'Role is already assigned to this user',
	ROLE_NOT_ASSIGNED: 'Role is not assigned to this user',
	NON_REMOVABLE_ROLES: 'Cannot remove non-removable roles',
} as const

/**
 * Error factory functions that include entity IDs for better debugging.
 * The error messages start with the base error constant for easy matching in tests.
 */
export const userRoleErrors = {
	userNotFound: (userId: number) => new Error(`${USER_ROLE_ERRORS.USER_NOT_FOUND} (userId: ${userId})`),
	roleNotFound: (roleId: number) => new Error(`${USER_ROLE_ERRORS.ROLE_NOT_FOUND} (roleId: ${roleId})`),
	roleAlreadyAssigned: (userId: number, roleId: number) =>
		new Error(`${USER_ROLE_ERRORS.ROLE_ALREADY_ASSIGNED} (userId: ${userId}, roleId: ${roleId})`),
	roleNotAssigned: (userId: number, roleId: number) =>
		new Error(`${USER_ROLE_ERRORS.ROLE_NOT_ASSIGNED} (userId: ${userId}, roleId: ${roleId})`),
	nonRemovableRoles: (roleIds: number[]) => new Error(`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: ${roleIds.join(', ')}`),
}
