import { PermissionName } from '@contracts/permission/permission.constants'
import { logger } from '@resetshop/util'
import { Next } from 'hono'
import { container } from '../container/container'
import { AuthenticatedContext } from './verify-access-token.middleware'

/**
 * Permission verification middleware for RBAC.
 *
 * ## Caching Strategy
 * Permissions are cached at the request level (stored in `c.permissions`).
 * This means:
 * - First permission check in a request fetches from database
 * - Subsequent checks in the same request use cached permissions
 * - No cross-request caching (each request fetches fresh permissions)
 *
 * This approach is acceptable for most use cases because:
 * - Multiple permission checks per request don't cause extra DB queries
 * - Permission changes take effect on the next request
 * - No stale cache invalidation complexity
 *
 * ## Future Optimization
 * If profiling shows permission fetching is a bottleneck for high-traffic
 * endpoints, consider:
 * - Redis caching with short TTL (e.g., 60 seconds)
 * - Including permissions in JWT claims (requires token refresh on changes)
 * - Background refresh pattern with stale-while-revalidate
 *
 * @module verify-permissions.middleware
 */

/**
 * Ensures user permissions are loaded and cached in the request context.
 * Fetches from database on first call, returns cached value on subsequent calls.
 *
 * @param c - The authenticated context
 * @returns Array of permission names
 * @throws Error if permission fetch fails (database errors, etc.)
 */
async function ensurePermissionsLoaded(c: AuthenticatedContext): Promise<string[]> {
	if (c.permissions) {
		return c.permissions
	}

	const { userRoleService } = container.cradle
	const permissions = await userRoleService.getUserPermissions(Number(c.user.sub))
	c.permissions = permissions.map((p) => p.name)
	return c.permissions
}

/**
 * Middleware factory that creates a permission check middleware.
 * Verifies the authenticated user has the specified permission.
 *
 * @param permissionName - The permission name to check (e.g., 'can_create_users')
 * @returns Hono middleware that checks for the permission
 *
 * @example
 * ```typescript
 * app.post('/users', requirePermission(permission('admin:users:create')), async (c) => {
 *   // Only users with 'admin:users:create' permission reach here
 * });
 * ```
 */
export function requirePermission(permissionName: PermissionName) {
	return async (c: AuthenticatedContext, next: Next) => {
		if (!c.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		let permissions: string[]
		try {
			permissions = await ensurePermissionsLoaded(c)
		} catch (error) {
			logger.error('VerifyPermissionsMiddleware', 'Failed to fetch user permissions', error)
			return c.json({ error: 'Internal server error' }, 500)
		}

		if (!permissions.includes(permissionName)) {
			return c.json({ error: 'Forbidden' }, 403)
		}

		await next()
	}
}

/**
 * Middleware factory that checks if user has ANY of the specified permissions.
 *
 * @param permissionNames - Array of permission names (user needs at least one)
 * @returns Hono middleware
 */
export function requireAnyPermission(permissionNames: PermissionName[]) {
	return async (c: AuthenticatedContext, next: Next) => {
		if (!c.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		let permissions: string[]
		try {
			permissions = await ensurePermissionsLoaded(c)
		} catch (error) {
			logger.error('VerifyPermissionsMiddleware', 'Failed to fetch user permissions', error)
			return c.json({ error: 'Internal server error' }, 500)
		}

		const hasAnyPermission = permissionNames.some((perm) => permissions.includes(perm))
		if (!hasAnyPermission) {
			return c.json({ error: 'Forbidden' }, 403)
		}

		await next()
	}
}

/**
 * Middleware factory that checks if user has ALL of the specified permissions.
 *
 * @param permissionNames - Array of permission names (user needs all of them)
 * @returns Hono middleware
 */
export function requireAllPermissions(permissionNames: PermissionName[]) {
	return async (c: AuthenticatedContext, next: Next) => {
		if (!c.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		let permissions: string[]
		try {
			permissions = await ensurePermissionsLoaded(c)
		} catch (error) {
			logger.error('VerifyPermissionsMiddleware', 'Failed to fetch user permissions', error)
			return c.json({ error: 'Internal server error' }, 500)
		}

		const hasAllPermissions = permissionNames.every((perm) => permissions.includes(perm))
		if (!hasAllPermissions) {
			return c.json({ error: 'Forbidden' }, 403)
		}

		await next()
	}
}
