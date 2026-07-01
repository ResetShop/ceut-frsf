import { errorResponseSchema, successMessageSchema } from '@contracts/common/error.schemas'
import { paginatedResponseSchema, paginationParamsSchema } from '@contracts/common/pagination.schemas'
import { permission } from '@contracts/permission/permission.constants'
import { permissionDataSchema, roleDataSchema } from '@contracts/role/role.schemas'
import { assignRoleToUserRequestSchema, replaceUserRolesRequestSchema } from '@contracts/user/user.schemas'
import { createRoute, z } from '@hono/zod-openapi'
import { requireAllPermissions, requirePermission } from '../../middlewares/verify-permissions.middleware'
import { commonResponses } from '../../openapi-config'

const userIdField = z.coerce.number().int().positive().openapi({ description: 'User ID', example: 1 })

const userIdParamSchema = z.object({ userId: userIdField })

const userIdAndRoleIdParamSchema = z.object({
	userId: userIdField,
	roleId: z.coerce.number().int().positive().openapi({ description: 'Role ID', example: 1 }),
})

export const getUserRolesRoute = createRoute({
	method: 'get',
	path: '/{userId}/roles',
	tags: ['User Roles'],
	summary: 'Get user roles',
	description: 'Get all roles assigned to a user with pagination.',
	middleware: [requirePermission(permission('admin:user_roles:read'))] as const,
	request: {
		params: userIdParamSchema,
		query: paginationParamsSchema,
	},
	responses: {
		200: {
			description: 'Paginated list of user roles',
			content: { 'application/json': { schema: paginatedResponseSchema(roleDataSchema) } },
		},
		400: {
			description: 'Invalid user ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const getUserPermissionsRoute = createRoute({
	method: 'get',
	path: '/{userId}/permissions',
	tags: ['User Roles'],
	summary: 'Get user permissions',
	description: 'Get all permissions for a user (aggregated from all their roles).',
	middleware: [requirePermission(permission('admin:user_roles:read'))] as const,
	request: { params: userIdParamSchema },
	responses: {
		200: {
			description: 'List of user permissions',
			content: { 'application/json': { schema: z.array(permissionDataSchema) } },
		},
		400: {
			description: 'Invalid user ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const assignRoleRoute = createRoute({
	method: 'post',
	path: '/{userId}/roles',
	tags: ['User Roles'],
	summary: 'Assign role to user',
	description: 'Assign a role to a user.',
	middleware: [requirePermission(permission('admin:user_roles:assign'))] as const,
	request: {
		params: userIdParamSchema,
		body: {
			content: { 'application/json': { schema: assignRoleToUserRequestSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			description: 'Role assigned',
			content: { 'application/json': { schema: successMessageSchema } },
		},
		400: {
			description: 'Invalid user ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User or role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		409: {
			description: 'Role already assigned',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const replaceUserRolesRoute = createRoute({
	method: 'put',
	path: '/{userId}/roles',
	tags: ['User Roles'],
	summary: 'Replace user roles',
	description: 'Replace all role assignments for a user.',
	middleware: [
		requireAllPermissions([permission('admin:user_roles:assign'), permission('admin:user_roles:remove')]),
	] as const,
	request: {
		params: userIdParamSchema,
		body: {
			content: { 'application/json': { schema: replaceUserRolesRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Roles replaced',
			content: { 'application/json': { schema: successMessageSchema } },
		},
		400: {
			description: 'Invalid input',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const removeRoleRoute = createRoute({
	method: 'delete',
	path: '/{userId}/roles/{roleId}',
	tags: ['User Roles'],
	summary: 'Remove role from user',
	description: 'Remove a role from a user.',
	middleware: [requirePermission(permission('admin:user_roles:remove'))] as const,
	request: { params: userIdAndRoleIdParamSchema },
	responses: {
		200: {
			description: 'Role removed',
			content: { 'application/json': { schema: successMessageSchema } },
		},
		400: {
			description: 'Invalid user or role ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User or role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})
