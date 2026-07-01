import type { ErrorResponse, SuccessMessage } from '@contracts/common/error.types'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import type { PermissionData, RoleData } from '@contracts/role/role.types'
import type { AssignRoleToUserRequest, ReplaceUserRolesRequest } from '@contracts/user/user.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { logger } from '@resetshop/util'
import { container } from '../../container/container'
import type { AuthenticatedContext } from '../../middlewares/verify-access-token.middleware'
import { USER_ROLE_ERRORS } from './user-role.errors'
import {
	assignRoleRoute,
	getUserPermissionsRoute,
	getUserRolesRoute,
	removeRoleRoute,
	replaceUserRolesRoute,
} from './user-role.routes'

const app = createOpenAPIApp()

/**
 * GET /api/users/:userId/roles
 * Get all roles assigned to a user with pagination
 */
registerRoute(app, getUserRolesRoute, async (c) => {
	const { userRoleService } = container.cradle
	const userId = Number(c.req.param('userId'))

	const { offset, limit } = c.req.valid('query')

	try {
		const roles = await userRoleService.getUserRoles(userId, { offset, limit })
		return c.json<PaginatedResponse<RoleData>>(roles)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_ROLE_ERRORS.USER_NOT_FOUND)) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

/**
 * GET /api/users/:userId/permissions
 * Get all permissions for a user (aggregated from all their roles)
 */
registerRoute(app, getUserPermissionsRoute, async (c) => {
	const { userRoleService } = container.cradle
	const userId = Number(c.req.param('userId'))

	try {
		const permissions = await userRoleService.getUserPermissions(userId)
		return c.json<PermissionData[]>(permissions)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_ROLE_ERRORS.USER_NOT_FOUND)) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

/**
 * POST /api/users/:userId/roles
 * Assign a role to a user
 */
registerRoute(app, assignRoleRoute, async (c) => {
	const { userRoleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const userId = Number(c.req.param('userId'))
	const { roleId }: AssignRoleToUserRequest = c.req.valid('json')

	try {
		await userRoleService.assignRoleToUser(userId, roleId, actorId)
		logger.security('user_role_assigned', { userId, roleId, actorId })
		return c.json<SuccessMessage>({ message: 'Role assigned successfully' }, 201)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(USER_ROLE_ERRORS.USER_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(USER_ROLE_ERRORS.ROLE_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(USER_ROLE_ERRORS.ROLE_ALREADY_ASSIGNED)) {
				return c.json<ErrorResponse>({ error: error.message }, 409)
			}
		}
		throw error
	}
})

/**
 * PUT /api/users/:userId/roles
 * Replace all role assignments for a user
 */
registerRoute(app, replaceUserRolesRoute, async (c) => {
	const { userRoleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const userId = Number(c.req.param('userId'))
	const { roleIds }: ReplaceUserRolesRequest = c.req.valid('json')

	try {
		// Prefetch for audit before-state — cost is accepted on error paths for audit fidelity
		const auditSnapshotLimit = 1000
		const existing = await userRoleService.getUserRoles(userId, { limit: auditSnapshotLimit })
		const oldRoleIds = existing.data.map((r) => r.id)

		await userRoleService.replaceUserRoles(userId, roleIds, actorId)
		logger.security('user_roles_replaced', { userId, oldRoleIds, newRoleIds: roleIds, actorId })
		return c.json<SuccessMessage>({ message: 'Roles replaced successfully' }, 200)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(USER_ROLE_ERRORS.USER_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(USER_ROLE_ERRORS.ROLES_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 400)
			}
			if (error.message.startsWith(USER_ROLE_ERRORS.NON_REMOVABLE_ROLES)) {
				return c.json<ErrorResponse>({ error: error.message }, 400)
			}
		}
		throw error
	}
})

/**
 * DELETE /api/users/:userId/roles/:roleId
 * Remove a role from a user
 */
registerRoute(app, removeRoleRoute, async (c) => {
	const { userRoleService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const userId = Number(c.req.param('userId'))
	const roleId = Number(c.req.param('roleId'))

	try {
		await userRoleService.removeRoleFromUser(userId, roleId, actorId)
		logger.security('user_role_removed', { userId, roleId, actorId })
		return c.json<SuccessMessage>({ message: 'Role removed successfully' })
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(USER_ROLE_ERRORS.USER_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
			if (error.message.startsWith(USER_ROLE_ERRORS.ROLE_NOT_ASSIGNED)) {
				return c.json<ErrorResponse>({ error: error.message }, 404)
			}
		}
		throw error
	}
})

export default app
