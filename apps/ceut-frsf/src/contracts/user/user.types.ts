import type { z } from 'zod'
import type {
	assignRoleToUserRequestSchema,
	authUserSchema,
	createUserRequestSchema,
	createUserResponseSchema,
	managedUserSchema,
	replaceUserRolesRequestSchema,
	resetPasswordResponseSchema,
	updateUserRequestSchema,
	updateUserStatusRequestSchema,
	userDataSchema,
} from './user.schemas'

// ============================================================================
// User Data Types
// ============================================================================

export type UserData = z.infer<typeof userDataSchema>
export type AuthUser = z.infer<typeof authUserSchema>

// ============================================================================
// Managed User Types (User Management API)
// ============================================================================

export type ManagedUser = z.infer<typeof managedUserSchema>
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>

// ============================================================================
// User Role Request Types
// ============================================================================

export type AssignRoleToUserRequest = z.infer<typeof assignRoleToUserRequestSchema>
export type ReplaceUserRolesRequest = z.infer<typeof replaceUserRolesRequestSchema>
export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusRequestSchema>
