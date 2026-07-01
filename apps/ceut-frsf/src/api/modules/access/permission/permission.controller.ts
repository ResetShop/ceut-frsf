import type { PaginatedResponse } from '@contracts/common/pagination.types'
import type { PermissionData } from '@contracts/role/role.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { container } from '../../../container/container'
import { listPermissionsRoute } from './permission.routes'

const app = createOpenAPIApp()

/**
 * GET /api/access/permissions
 * List all system permissions with pagination and optional search
 */
registerRoute(app, listPermissionsRoute, async (c) => {
	const { permissionService } = container.cradle
	const { offset, limit, search } = c.req.valid('query')
	const permissions = await permissionService.getAllPermissions({ offset, limit, search })
	return c.json<PaginatedResponse<PermissionData>>(permissions)
})

export default app
