import { z } from 'zod'
import { QUERY_DEFAULTS } from '../common/query.constants'

// ============================================================================
// Permission Schemas
// ============================================================================

/**
 * Permission data schema for role-permission relationships.
 *
 * The frontend domain model computes an `identifier` field as
 * `${module}:${resource}:${action}` for permission matching. This is intentionally
 * not part of the API contract to avoid redundant data transfer.
 */
export const permissionDataSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string().nullable(),
	module: z.string(),
	resource: z.string(),
	action: z.string(),
})

// ============================================================================
// Role Schemas
// ============================================================================

/**
 * Role data schema returned from the database.
 */
export const roleDataSchema = z.object({
	id: z.number(),
	name: z.string(),
	code: z.string(),
	description: z.string().nullable(),
	removable: z.boolean(),
	createdAt: z.coerce.date().nullable(),
	updatedAt: z.coerce.date().nullable(),
})

/**
 * Role with nested permissions schema for introspection responses.
 */
export const roleWithPermissionsSchema = z.object({
	id: z.number(),
	code: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	removable: z.boolean(),
	createdAt: z.coerce.date().nullable(),
	updatedAt: z.coerce.date().nullable(),
	permissions: z.array(permissionDataSchema),
})

// ============================================================================
// Request Schemas
// ============================================================================

export const createRoleRequestSchema = z.object({
	name: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH),
	code: z
		.string()
		.min(QUERY_DEFAULTS.FIELD_MIN_LENGTH)
		.max(QUERY_DEFAULTS.CODE_MAX_LENGTH)
		.regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase alphanumeric with underscores, starting with a letter'),
	description: z.string().max(QUERY_DEFAULTS.DESCRIPTION_MAX_LENGTH).optional(),
})

export const updateRoleRequestSchema = z.object({
	name: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH).max(QUERY_DEFAULTS.NAME_MAX_LENGTH).optional(),
	description: z.string().max(QUERY_DEFAULTS.DESCRIPTION_MAX_LENGTH).optional(),
})

export const assignPermissionsRequestSchema = z.object({
	permissionIds: z.array(z.number().int().positive()),
})

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Error response with invalid permission IDs details.
 */
export const permissionAssignmentErrorSchema = z.object({
	error: z.string(),
	details: z
		.object({
			invalidIds: z.array(z.number()),
		})
		.optional(),
})
