import type { z } from 'zod'
import type {
	assignPermissionsRequestSchema,
	createRoleRequestSchema,
	permissionAssignmentErrorSchema,
	permissionDataSchema,
	roleDataSchema,
	roleWithPermissionsSchema,
	updateRoleRequestSchema,
} from './role.schemas'

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionData = z.infer<typeof permissionDataSchema>

// ============================================================================
// Role Types
// ============================================================================

export type RoleData = z.infer<typeof roleDataSchema>
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>

// ============================================================================
// Request Types
// ============================================================================

export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>
export type AssignPermissionsRequest = z.infer<typeof assignPermissionsRequestSchema>

// ============================================================================
// Response Types
// ============================================================================

export type PermissionAssignmentError = z.infer<typeof permissionAssignmentErrorSchema>
