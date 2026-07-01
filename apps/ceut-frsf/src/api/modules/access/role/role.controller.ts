import type { ErrorResponse, SuccessMessage } from '@contracts/common/error.types'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import type {
	AssignPermissionsRequest,
	CreateRoleRequest,
	PermissionAssignmentError,
	PermissionData,
	RoleData,
	UpdateRoleRequest,
} from '@contracts/role/role.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { logger } from '@resetshop/util'
import { container } from '../../../container/container'
import type { AuthenticatedContext } from '../../../middlewares/verify-access-token.middleware'
import {
	assignPermissionsRoute,
	createRoleRoute,
	deleteRoleRoute,
	getRolePermissionsRoute,
	getRoleRoute,
	listRolesRoute,
	updateRoleRoute,
} from './role.routes'
import { InvalidPermissionIdsError, ROLE_ERRORS, SelfLockoutError } from './role.service'

const app = createOpenAPIApp()

/**
 * GET /api/access/roles
 * Get all roles with pagination and optional search
 */
registerRoute(app, listRolesRoute, async (c) => {
	const { roleService } = container.cradle
	const { offset, limit, search } = c.req.valid('query')
	const roles = await roleService.getAllRoles({ offset, limit, search })
	return c.json<PaginatedResponse<RoleData>>(roles)
})

/**
 * GET /api/access/roles/:id
 * Get a role by ID
 */
registerRoute(app, getRoleRoute, async (c) => {
	const { roleService } = container.cradle
	const id = Number(c.req.param('id'))

	const role = await roleService.getRole(id)

	if (!role) {
		return c.json<ErrorResponse>({ error: ROLE_ERRORS.NOT_FOUND }, 404)
	}

	return c.json<RoleData>(role)
})

/**
 * POST /api/access/roles
 * Create a new role
 */
registerRoute(app, createRoleRoute, async (c) => {
	const { roleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const body: CreateRoleRequest = c.req.valid('json')

	try {
		const role = await roleService.createRole(body, actorId)
		logger.security('role_created', { roleId: role.id, name: role.name, code: role.code, actorId })
		return c.json<RoleData>(role, 201)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(ROLE_ERRORS.CODE_EXISTS) || error.message.startsWith(ROLE_ERRORS.NAME_EXISTS)) {
				return c.json<ErrorResponse>({ error: error.message }, 409)
			}
		}
		throw error
	}
})

/**
 * PUT /api/access/roles/:id
 * Update a role
 */
registerRoute(app, updateRoleRoute, async (c) => {
	const { roleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const id = Number(c.req.param('id'))
	const body: UpdateRoleRequest = c.req.valid('json')

	try {
		const role = await roleService.updateRole(id, body, actorId)
		logger.security('role_updated', {
			roleId: id,
			changes: { name: body.name, description: body.description },
			actorId,
		})
		return c.json<RoleData>(role)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(ROLE_ERRORS.NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(ROLE_ERRORS.NAME_EXISTS)) {
				return c.json<ErrorResponse>({ error: error.message }, 409)
			}
		}
		throw error
	}
})

/**
 * DELETE /api/access/roles/:id
 * Delete a role
 */
registerRoute(app, deleteRoleRoute, async (c) => {
	const { roleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const id = Number(c.req.param('id'))

	try {
		await roleService.deleteRole(id, actorId)
		logger.security('role_deleted', { roleId: id, actorId })
		return c.json<SuccessMessage>({ message: 'Role deleted successfully' })
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(ROLE_ERRORS.NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(ROLE_ERRORS.NOT_REMOVABLE)) {
				return c.json<ErrorResponse>({ error: error.message }, 403)
			}
		}
		throw error
	}
})

/**
 * GET /api/access/roles/:id/permissions
 * Get all permissions assigned to a role with pagination
 */
registerRoute(app, getRolePermissionsRoute, async (c) => {
	const { roleService } = container.cradle
	const id = Number(c.req.param('id'))

	const { offset, limit } = c.req.valid('query')

	try {
		const permissions = await roleService.getRolePermissions(id, { offset, limit })
		return c.json<PaginatedResponse<PermissionData>>(permissions)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(ROLE_ERRORS.NOT_FOUND)) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

/**
 * PUT /api/access/roles/:id/permissions
 * Replace all permissions for a role.
 * This is a full replacement operation - existing permissions are removed
 * and replaced with the provided list.
 */
registerRoute(app, assignPermissionsRoute, async (c) => {
	const { roleService } = container.cradle
	const id = Number(c.req.param('id'))
	const { permissionIds }: AssignPermissionsRequest = c.req.valid('json')
	const actorId = Number((c as AuthenticatedContext).user.sub)

	try {
		// Prefetch for audit before-state — cost is accepted on error paths for audit fidelity
		const auditSnapshotLimit = 1000
		const existing = await roleService.getRolePermissions(id, { limit: auditSnapshotLimit })
		const oldPermissionIds = existing.data.map((p) => p.id)

		await roleService.assignPermissionsToRole(id, permissionIds, actorId)
		logger.security('role_permissions_changed', {
			roleId: id,
			oldPermissionIds,
			newPermissionIds: permissionIds,
			actorId,
		})
		return c.json<SuccessMessage>({ message: 'Permissions assigned successfully' })
	} catch (error) {
		if (error instanceof SelfLockoutError) {
			logger.security('self_lockout_blocked', { actorId, operation: 'role_permissions_changed', reason: error.message })
			return c.json<ErrorResponse>({ error: error.message }, 403)
		}
		if (error instanceof InvalidPermissionIdsError) {
			return c.json<PermissionAssignmentError>({ error: error.message, details: { invalidIds: error.invalidIds } }, 400)
		}
		if (error instanceof Error && error.message.startsWith(ROLE_ERRORS.NOT_FOUND)) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

export default app
