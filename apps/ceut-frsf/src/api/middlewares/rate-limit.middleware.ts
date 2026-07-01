import { logger, parseDurationToMs } from '@resetshop/util'
import type { Context } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { securityEnv } from '../config/security.env'
import {
	FORGOT_PASSWORD_RATE_LIMIT_MAX,
	FORGOT_PASSWORD_RATE_LIMIT_WINDOW,
	LOGIN_RATE_LIMIT_MAX,
	LOGIN_RATE_LIMIT_WINDOW,
	REFRESH_RATE_LIMIT_MAX,
	REFRESH_RATE_LIMIT_WINDOW,
	RESET_PASSWORD_RATE_LIMIT_MAX,
	RESET_PASSWORD_RATE_LIMIT_WINDOW,
} from '../constants/auth.constants'

/**
 * Extracts the client IP address from proxy headers.
 * Falls back to 'unknown' when no IP can be determined.
 */
export function getClientIp(c: Context): string {
	const forwarded = c.req.header('x-forwarded-for')
	if (forwarded) {
		return forwarded.split(',')[0].trim()
	}
	return c.req.header('x-real-ip') ?? 'unknown'
}

function createRateLimitHandler(endpoint: string) {
	return (c: Context) => {
		logger.security('rate_limit_hit', { endpoint, ip: getClientIp(c) })
		return c.json({ error: 'Too many requests. Please try again later.' }, 429)
	}
}

/** Rate limiter for POST /api/auth/login — 5 attempts per 15 minutes per IP. */
export const loginRateLimiter = rateLimiter({
	windowMs: parseDurationToMs(LOGIN_RATE_LIMIT_WINDOW),
	limit: LOGIN_RATE_LIMIT_MAX,
	standardHeaders: 'draft-7',
	keyGenerator: getClientIp,
	handler: createRateLimitHandler('/api/auth/login'),
})

/** Rate limiter for POST /api/auth/refresh — 10 attempts per 1 minute per IP. */
export const refreshRateLimiter = rateLimiter({
	windowMs: parseDurationToMs(REFRESH_RATE_LIMIT_WINDOW),
	limit: REFRESH_RATE_LIMIT_MAX,
	standardHeaders: 'draft-7',
	keyGenerator: getClientIp,
	handler: createRateLimitHandler('/api/auth/refresh'),
})

/**
 * Rate limiter for POST /api/auth/change-password — defaults to 5 attempts per 15 minutes per IP.
 * Window and limit are overridable via AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW / _MAX.
 *
 * Built lazily on the first request rather than at module-eval so that importing this module never
 * reads an env proxy at evaluation time — the Angular SSR route-extraction / prerender worker imports
 * the server bundle with no env vars set, and an eager required-env read there would `process.exit(1)`.
 * `securityEnv` (the source here) carries no required fields, so the read is safe regardless, but the
 * lazy pattern keeps the module import side-effect-free. This mirrors the deferred `cors()` middleware
 * in `server.ts`. The other limiters above read only compile-time constants, so they stay eager.
 */
let changePasswordRateLimiterImpl: ReturnType<typeof rateLimiter> | null = null
export const changePasswordRateLimiter: ReturnType<typeof rateLimiter> = (c, next) => {
	if (changePasswordRateLimiterImpl === null) {
		changePasswordRateLimiterImpl = rateLimiter({
			windowMs: parseDurationToMs(securityEnv.AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW),
			limit: securityEnv.AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX,
			standardHeaders: 'draft-7',
			keyGenerator: getClientIp,
			handler: createRateLimitHandler('/api/auth/change-password'),
		})
	}
	return changePasswordRateLimiterImpl(c, next)
}

/** Rate limiter for POST /api/auth/forgot-password — 5 requests per 15 minutes per IP. */
export const forgotPasswordRateLimiter = rateLimiter({
	windowMs: parseDurationToMs(FORGOT_PASSWORD_RATE_LIMIT_WINDOW),
	limit: FORGOT_PASSWORD_RATE_LIMIT_MAX,
	standardHeaders: 'draft-7',
	keyGenerator: getClientIp,
	handler: createRateLimitHandler('/api/auth/forgot-password'),
})

/** Rate limiter for POST /api/auth/reset-password — 5 attempts per 15 minutes per IP. */
export const resetPasswordRateLimiter = rateLimiter({
	windowMs: parseDurationToMs(RESET_PASSWORD_RATE_LIMIT_WINDOW),
	limit: RESET_PASSWORD_RATE_LIMIT_MAX,
	standardHeaders: 'draft-7',
	keyGenerator: getClientIp,
	handler: createRateLimitHandler('/api/auth/reset-password'),
})
