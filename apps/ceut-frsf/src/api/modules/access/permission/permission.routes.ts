import { paginatedResponseSchema, searchPaginationSchema } from '@contracts/common/pagination.schemas'
import { permission } from '@contracts/permission/permission.constants'
import { permissionDataSchema } from '@contracts/role/role.schemas'
import { createRoute } from '@hono/zod-openapi'
import { requirePermission } from '../../../middlewares/verify-permissions.middleware'
import { commonResponses } from '../../../openapi-config'

export const listPermissionsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Permissions'],
	summary: 'List all permissions',
	description: 'List all system permissions with pagination and optional search.',
	middleware: [requirePermission(permission('admin:permissions:read'))] as const,
	request: {
		query: searchPaginationSchema,
	},
	responses: {
		200: {
			description: 'Paginated list of permissions',
			content: { 'application/json': { schema: paginatedResponseSchema(permissionDataSchema) } },
		},
		...commonResponses,
	},
})
