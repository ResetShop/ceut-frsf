import { z } from 'zod'
import { QUERY_DEFAULTS } from '../common/query.constants'
import { roleDataSchema, roleWithPermissionsSchema } from '../role/role.schemas'
import { UserStatus } from './user.constants'

export const userStatusSchema = z.enum([UserStatus.ACTIVE, UserStatus.DISABLED, UserStatus.DELETED])

// ============================================================================
// User Data Schemas
// ============================================================================

/**
 * Full user data schema returned from the database.
 */
export const userDataSchema = z.object({
	id: z.number(),
	email: z.email(),
	firstName: z.string(),
	lastName: z.string(),
	status: userStatusSchema,
})

/**
 * Auth user schema — the authenticated user with their full roles + permissions.
 * Returned from `POST /api/auth/login` (wrapped) and `GET /api/auth/me` (directly).
 * Excludes `status` and audit fields which belong to the management layer only.
 */
export const authUserSchema = z.object({
	id: z.number(),
	email: z.email(),
	firstName: z.string(),
	lastName: z.string(),
	roles: z.array(roleWithPermissionsSchema),
})

// ============================================================================
// Managed User Schemas (User Management API)
// ============================================================================

/**
 * Managed user schema with roles array for user management responses.
 * Includes user data with their assigned roles.
 */
export const managedUserSchema = z.object({
	id: z.number(),
	email: z.email(),
	firstName: z.string(),
	lastName: z.string(),
	status: userStatusSchema,
	statusChangedAt: z.coerce.date().nullable(),
	statusChangedBy: z.number().nullable(),
	deletedAt: z.coerce.date().nullable(),
	createdAt: z.coerce.date().nullable(),
	updatedAt: z.coerce.date().nullable(),
	roles: z.array(roleDataSchema),
})

// ============================================================================
// User Management Request Schemas
// ============================================================================

/**
 * Create user request body schema.
 * Requires email, first/last name, and optional role IDs.
 * Password is auto-generated server-side and sent via welcome email.
 */
export const createUserRequestSchema = z.object({
	email: z.email(),
	firstName: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH),
	lastName: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH),
	roleIds: z.array(z.number().int().positive()).optional(),
	mustChangePassword: z.boolean().optional().default(true),
})

/**
 * Create user response schema.
 * Extends managed user with a flag indicating whether the welcome email was sent.
 */
export const createUserResponseSchema = managedUserSchema.extend({
	passwordEmailSent: z.boolean(),
})

/**
 * Update user request body schema.
 * All fields are optional - only provided fields are updated.
 */
export const updateUserRequestSchema = z.object({
	email: z.email().optional(),
	firstName: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH).optional(),
	lastName: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH).optional(),
	roleIds: z.array(z.number().int().positive()).optional(),
})

/**
 * Update user status request body schema.
 * Only allows non-terminal transitions — use DELETE endpoint for deletion.
 */
export const updateUserStatusRequestSchema = z.object({
	status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]),
})

/**
 * Reset password response schema.
 * Returned from the admin-initiated password reset endpoint. The generated password is intentionally
 * omitted — it is emailed to the user, never returned. The response is sent as soon as the password
 * is reset; the email is dispatched best-effort AFTER the response, so no `passwordEmailSent` flag is
 * reported (delivery is not known at response time).
 */
export const resetPasswordResponseSchema = z.object({
	message: z.string(),
})

// ============================================================================
// User Role Request Schemas
// ============================================================================

/**
 * Assign role to user request body schema.
 */
export const assignRoleToUserRequestSchema = z.object({
	roleId: z.number().int().positive(),
})

/**
 * Replace all role assignments for a user request body schema.
 */
export const replaceUserRolesRequestSchema = z.object({
	roleIds: z
		.array(z.number().int().positive())
		.max(QUERY_DEFAULTS.MAX_ROLE_IDS_PER_REQUEST)
		.refine((ids) => new Set(ids).size === ids.length, 'roleIds must be unique'),
})
