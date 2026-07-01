import { logger } from '@resetshop/util'
import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/auth.constants'
import { container } from '../container/container'

export interface AuthenticatedContext extends Context {
	user?: {
		sub: string
		email: string
		firstName: string
		lastName: string
	}
	permissions?: string[]
}

/**
 * Hono middleware to validate Paseto access token from HttpOnly cookie
 */
export default async function verifyAccessToken(c: Context, next: Next) {
	const { pasetoService } = container.cradle
	const token = getCookie(c, ACCESS_TOKEN_COOKIE_NAME)

	if (!token) {
		return c.json({ error: 'Missing access token cookie' }, 401)
	}

	try {
		const payload = await pasetoService.verifyAccessToken(token)

		// Attach user info to context
		;(c as AuthenticatedContext).user = {
			sub: payload.sub,
			email: payload.email,
			firstName: payload.firstName,
			lastName: payload.lastName,
		}

		await next()
	} catch (error) {
		logger.error('verifyAccessToken', 'Token verification failed', error)
		return c.json({ error: 'Invalid or expired token' }, 401)
	}
}
