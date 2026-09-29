import { isAuthError } from '@contracts/auth/auth.errors'
import type { ErrorResponse } from '@contracts/common/error.types'
import type { AuthUser, UpdateProfileRequest } from '@contracts/user/user.types'
import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { logger } from '@resetshop/util'
import { container } from '../../container/container'
import { getAuthenticatedUser } from '../../middlewares/verify-access-token.middleware'
import { USER_MANAGEMENT_ERRORS } from './user-management.service'
import { updateProfileRoute } from './user-profile.routes'

const app = createOpenAPIApp()

/**
 * PATCH /api/users/me
 * Self-service update of the caller's own profile
 */
registerRoute(app, updateProfileRoute, async (c) => {
	const { authService, userProfileService } = container.cradle
	const userId = Number(getAuthenticatedUser(c).sub)
	const body: UpdateProfileRequest = c.req.valid('json')

	try {
		await authService.getSessionUser(userId)
		const user = await userProfileService.updateOwnProfile(userId, body)
		logger.security('profile_updated', { userId, changes: body })
		return c.json<AuthUser>(user)
	} catch (error) {
		// An inactive or vanished account answers the same 401 whichever step detected it, so the
		// response never reveals the account's status.
		const accountGone = error instanceof Error && error.message.startsWith(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		if (isAuthError(error) || accountGone) {
			return c.json<ErrorResponse>({ error: 'Unauthorized' }, 401)
		}
		throw error
	}
})

export default app
