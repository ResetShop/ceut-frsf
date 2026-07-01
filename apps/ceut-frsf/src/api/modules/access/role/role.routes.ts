import { errorResponseSchema, successMessageSchema } from '@contracts/common/error.schemas'
import {
	paginatedResponseSchema,
	paginationParamsSchema,
	searchPaginationSchema,
} from '@contracts/common/pagination.schemas'
import { permission } from '@contracts/permission/permission.constants'
import {
	assignPermissionsRequestSchema,
	createRoleRequestSchema,
	permissionAssignmentErrorSchema,
	permissionDataSchema,
	roleDataSchema,
	updateRoleRequestSchema,
} from '@contracts/role/role.schemas'
import { createRoute } from '@hono/zod-openapi'
import { requirePermission } from '../../../middlewares/verify-permissions.middleware'
import { commonResponses, idParamSchema } from '../../../openapi-config'

export const listRolesRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Roles'],
	summary: 'List all roles',
	description: 'Get all roles with pagination and optional search.',
	middleware: [requirePermission(permission('admin:roles:read'))] as const,
	request: { query: searchPaginationSchema },
	responses: {
		200: {
			description: 'Paginated list of roles',
			content: { 'application/json': { schema: paginatedResponseSchema(roleDataSchema) } },
		},
		...commonResponses,
	},
})

export const getRoleRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Roles'],
	summary: 'Get role by ID',
	description: 'Get a single role by its ID.',
	middleware: [requirePermission(permission('admin:roles:read'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'Role details',
			content: { 'application/json': { schema: roleDataSchema } },
		},
		400: {
			description: 'Invalid role ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const createRoleRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Roles'],
	summary: 'Create a role',
	description: 'Create a new role.',
	middleware: [requirePermission(permission('admin:roles:create'))] as const,
	request: {
		body: {
			content: { 'application/json': { schema: createRoleRequestSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			description: 'Role created',
			content: { 'application/json': { schema: roleDataSchema } },
		},
		409: {
			description: 'Duplicate role name or code',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const updateRoleRoute = createRoute({
	method: 'put',
	path: '/{id}',
	tags: ['Roles'],
	summary: 'Update a role',
	description: 'Update an existing role.',
	middleware: [requirePermission(permission('admin:roles:update'))] as const,
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: updateRoleRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Role updated',
			content: { 'application/json': { schema: roleDataSchema } },
		},
		400: {
			description: 'Invalid role ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		409: {
			description: 'Duplicate role name',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const deleteRoleRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Roles'],
	summary: 'Delete a role',
	description: 'Delete an existing role.',
	middleware: [requirePermission(permission('admin:roles:delete'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'Role deleted',
			content: { 'application/json': { schema: successMessageSchema } },
		},
		400: {
			description: 'Invalid role ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		403: {
			description: 'Role is not removable',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const getRolePermissionsRoute = createRoute({
	method: 'get',
	path: '/{id}/permissions',
	tags: ['Roles'],
	summary: 'Get role permissions',
	description: 'Get all permissions assigned to a role with pagination.',
	middleware: [requirePermission(permission('admin:roles:read'))] as const,
	request: {
		params: idParamSchema,
		query: paginationParamsSchema,
	},
	responses: {
		200: {
			description: 'Paginated list of role permissions',
			content: { 'application/json': { schema: paginatedResponseSchema(permissionDataSchema) } },
		},
		400: {
			description: 'Invalid role ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const assignPermissionsRoute = createRoute({
	method: 'put',
	path: '/{id}/permissions',
	tags: ['Roles'],
	summary: 'Assign permissions to role',
	description: 'Replace all permissions for a role. Full replacement operation.',
	middleware: [requirePermission(permission('admin:roles:update'))] as const,
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: assignPermissionsRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Permissions assigned',
			content: { 'application/json': { schema: successMessageSchema } },
		},
		400: {
			description: 'Invalid permission IDs',
			content: { 'application/json': { schema: permissionAssignmentErrorSchema } },
		},
		403: {
			description: 'Self-lockout: removing your own admin permission is not allowed',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'Role not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})
