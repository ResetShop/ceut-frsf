import { errorResponseSchema, successMessageSchema } from '@contracts/common/error.schemas'
import { paginatedResponseSchema, searchPaginationSchema } from '@contracts/common/pagination.schemas'
import { permission } from '@contracts/permission/permission.constants'
import {
	createUserRequestSchema,
	createUserResponseSchema,
	managedUserSchema,
	resetPasswordResponseSchema,
	updateUserRequestSchema,
	updateUserStatusRequestSchema,
} from '@contracts/user/user.schemas'
import { createRoute } from '@hono/zod-openapi'
import { requirePermission } from '../../middlewares/verify-permissions.middleware'
import { commonResponses, idParamSchema } from '../../openapi-config'

export const listUsersRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Users'],
	summary: 'List users',
	description: 'List users with pagination and optional search.',
	middleware: [requirePermission(permission('admin:users:read'))] as const,
	request: { query: searchPaginationSchema },
	responses: {
		200: {
			description: 'Paginated list of users',
			content: { 'application/json': { schema: paginatedResponseSchema(managedUserSchema) } },
		},
		...commonResponses,
	},
})

export const getUserRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Users'],
	summary: 'Get user by ID',
	description: 'Get user details with roles.',
	middleware: [requirePermission(permission('admin:users:read'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'User details',
			content: { 'application/json': { schema: managedUserSchema } },
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

export const createUserRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Users'],
	summary: 'Create a user',
	description: 'Create a new user with optional role assignments.',
	middleware: [requirePermission(permission('admin:users:create'))] as const,
	request: {
		body: {
			content: { 'application/json': { schema: createUserRequestSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			description: 'User created',
			content: { 'application/json': { schema: createUserResponseSchema } },
		},
		409: {
			description: 'Email already exists',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const updateUserRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Users'],
	summary: 'Update a user',
	description: 'Update user details or role assignments.',
	middleware: [requirePermission(permission('admin:users:update'))] as const,
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: updateUserRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'User updated',
			content: { 'application/json': { schema: managedUserSchema } },
		},
		400: {
			description: 'Invalid user ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		409: {
			description: 'Email already exists',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const updateUserStatusRoute = createRoute({
	method: 'patch',
	path: '/{id}/status',
	tags: ['Users'],
	summary: 'Update user status',
	description: 'Update user account status with state machine enforcement.',
	middleware: [requirePermission(permission('admin:users:disable'))] as const,
	request: {
		params: idParamSchema,
		body: {
			content: { 'application/json': { schema: updateUserStatusRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'User status updated',
			content: { 'application/json': { schema: managedUserSchema } },
		},
		400: {
			description: 'Invalid user ID',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		403: {
			description: 'Cannot change status of own account',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		422: {
			description: 'Invalid status transition',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const deleteUserRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Users'],
	summary: 'Delete a user',
	description: 'Soft delete a user.',
	middleware: [requirePermission(permission('admin:users:delete'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'User deleted',
			content: { 'application/json': { schema: successMessageSchema } },
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

export const resetPasswordRoute = createRoute({
	method: 'post',
	path: '/{id}/reset-password',
	tags: ['Users'],
	summary: 'Reset user password',
	description:
		'Admin-initiated password reset. Generates a new temporary password, sets mustChangePassword to true, and emails it to the user. The generated password is never returned to the admin.',
	middleware: [requirePermission(permission('admin:users:reset_password'))] as const,
	request: { params: idParamSchema },
	responses: {
		200: {
			description: 'Password reset and email dispatched',
			content: { 'application/json': { schema: resetPasswordResponseSchema } },
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
