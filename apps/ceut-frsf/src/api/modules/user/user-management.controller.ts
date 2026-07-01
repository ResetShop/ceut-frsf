import type { ErrorResponse, SuccessMessage } from '@contracts/common/error.types'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import type {
	CreateUserRequest,
	CreateUserResponse,
	ManagedUser,
	ResetPasswordResponse,
	UpdateUserRequest,
	UpdateUserStatusRequest,
} from '@contracts/user/user.types'
import { createOpenAPIApp, deferAfterResponse, registerRoute } from '@resetshop/hono-core'
import { logger } from '@resetshop/util'
import { container } from '../../container/container'
import type { AuthenticatedContext } from '../../middlewares/verify-access-token.middleware'
import {
	createUserRoute,
	deleteUserRoute,
	getUserRoute,
	listUsersRoute,
	resetPasswordRoute,
	updateUserRoute,
	updateUserStatusRoute,
} from './user-management.routes'
import { USER_MANAGEMENT_ERRORS } from './user-management.service'
import { USER_ROLE_ERRORS } from './user-role.errors'

const ERROR_STATUS_MAP = [
	[USER_MANAGEMENT_ERRORS.NOT_FOUND, 404],
	[USER_MANAGEMENT_ERRORS.EMAIL_EXISTS, 409],
	[USER_MANAGEMENT_ERRORS.SELF_LOCKOUT, 403],
	[USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL, 403],
	[USER_MANAGEMENT_ERRORS.INVALID_TRANSITION, 422],
] as const

function resolveErrorStatus(error: unknown): { message: string; status: 403 | 404 | 409 | 422 } | null {
	if (!(error instanceof Error)) return null
	for (const [prefix, status] of ERROR_STATUS_MAP) {
		if (error.message.startsWith(prefix)) return { message: error.message, status }
	}
	return null
}

const app = createOpenAPIApp()

/**
 * GET /api/users
 * List users with pagination and optional search
 */
registerRoute(app, listUsersRoute, async (c) => {
	const { userManagementService } = container.cradle
	// TODO: Replace inline type with SearchPaginationParams once defined in contracts (prototype branch)
	const { offset, limit, search }: { offset?: number; limit?: number; search?: string } = c.req.valid('query')

	const users = await userManagementService.getAllUsers({ offset, limit }, search)
	return c.json<PaginatedResponse<ManagedUser>>(users)
})

/**
 * GET /api/users/:id
 * Get user details with roles
 */
registerRoute(app, getUserRoute, async (c) => {
	const { userManagementService } = container.cradle
	const { id }: { id: number } = c.req.valid('param')

	try {
		const userData = await userManagementService.getUser(id)
		return c.json<ManagedUser>(userData)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.NOT_FOUND)) {
			return c.json<ErrorResponse>({ error: error.message }, 404)
		}
		throw error
	}
})

/**
 * POST /api/users
 * Create a new user with optional role assignments
 */
registerRoute(app, createUserRoute, async (c) => {
	const { userManagementService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const body: CreateUserRequest = c.req.valid('json')

	try {
		const result = await userManagementService.createUser(body, actorId)
		logger.security('user_created', { userId: result.id, email: result.email, actorId })
		return c.json<CreateUserResponse>(result, 201)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.startsWith(USER_MANAGEMENT_ERRORS.EMAIL_EXISTS)) {
				return c.json<ErrorResponse>({ error: error.message }, 409)
			}
			// Role assignment is composed into user creation, so invalid role IDs surface here.
			// (replaceUserRoles' NON_REMOVABLE_ROLES guard is unreachable at create time — a
			// brand-new user has no existing roles to drop — so only ROLES_NOT_FOUND needs mapping.)
			if (error.message.startsWith(USER_ROLE_ERRORS.ROLES_NOT_FOUND)) {
				return c.json<ErrorResponse>({ error: error.message }, 400)
			}
		}
		throw error
	}
})

/**
 * PATCH /api/users/:id
 * Update user details or role assignments
 */
registerRoute(app, updateUserRoute, async (c) => {
	const { userManagementService } = container.cradle
	const actorId = Number((c as AuthenticatedContext).user.sub)
	const { id }: { id: number } = c.req.valid('param')
	const body: UpdateUserRequest = c.req.valid('json')

	try {
		const userData = await userManagementService.updateUser(id, body, actorId)
		logger.security('user_updated', {
			userId: id,
			changes: { email: body.email, firstName: body.firstName, lastName: body.lastName, roleIds: body.roleIds },
			actorId,
		})
		return c.json<ManagedUser>(userData)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL)) {
			logger.security('self_admin_removal_blocked', { actorId, userId: id, reason: error.message })
		}
		const mapped = resolveErrorStatus(error)
		if (mapped) return c.json<ErrorResponse>({ error: mapped.message }, mapped.status)
		throw error
	}
})

/**
 * PATCH /api/users/:id/status
 * Update user account status (state machine enforcement)
 */
registerRoute(app, updateUserStatusRoute, async (c) => {
	const { userManagementService } = container.cradle
	const { id }: { id: number } = c.req.valid('param')
	const body: UpdateUserStatusRequest = c.req.valid('json')
	const actorId = Number((c as AuthenticatedContext).user.sub)

	try {
		// Prefetch for audit before-state — cost is accepted on error paths for audit fidelity
		const existingUser = await userManagementService.getUser(id)
		const userData = await userManagementService.updateUserStatus(id, {
			status: body.status,
			changedBy: actorId,
		})
		logger.security('user_status_changed', {
			userId: id,
			oldStatus: existingUser.status,
			newStatus: body.status,
			actorId,
		})
		return c.json<ManagedUser>(userData)
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)) {
			logger.security('self_lockout_blocked', { actorId, operation: 'user_status_changed', reason: error.message })
		}
		const mapped = resolveErrorStatus(error)
		if (mapped) return c.json<ErrorResponse>({ error: mapped.message }, mapped.status)
		throw error
	}
})

/**
 * DELETE /api/users/:id
 * Soft delete a user
 */
registerRoute(app, deleteUserRoute, async (c) => {
	const { userManagementService } = container.cradle
	const { id }: { id: number } = c.req.valid('param')
	const actorId = Number((c as AuthenticatedContext).user.sub)

	try {
		await userManagementService.deleteUser(id, actorId)
		logger.security('user_deleted', { userId: id, actorId })
		return c.json<SuccessMessage>({ message: 'User deleted successfully' })
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)) {
			logger.security('self_lockout_blocked', { actorId, operation: 'user_deleted', reason: error.message })
		}
		const mapped = resolveErrorStatus(error)
		if (mapped) return c.json<ErrorResponse>({ error: mapped.message }, mapped.status)
		throw error
	}
})

/**
 * POST /api/users/:id/reset-password
 * Admin-initiated password reset — generates, hashes, and persists a new temp password, then responds
 * immediately. The temp-password email is dispatched best-effort AFTER the response (deferAfterResponse)
 * so the client's success toast reflects the completed reset, not the SMTP round-trip.
 */
registerRoute(app, resetPasswordRoute, async (c) => {
	const { userManagementService } = container.cradle
	const { id }: { id: number } = c.req.valid('param')
	const actorId = Number((c as AuthenticatedContext).user.sub)

	try {
		const { message, sendResetEmail } = await userManagementService.resetPassword(id, actorId)
		logger.security('user_password_reset', { userId: id, actorId })
		deferAfterResponse(c, sendResetEmail, {
			onError: (error) => logger.error('UserManagement', 'Reset password email failed', error),
		})
		return c.json<ResetPasswordResponse>({ message })
	} catch (error) {
		if (error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT)) {
			logger.security('self_lockout_blocked', { actorId, operation: 'user_password_reset', reason: error.message })
		}
		const mapped = resolveErrorStatus(error)
		if (mapped) return c.json<ErrorResponse>({ error: mapped.message }, mapped.status)
		throw error
	}
})

export default app
