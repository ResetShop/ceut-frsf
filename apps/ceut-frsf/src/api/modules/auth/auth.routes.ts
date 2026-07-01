import {
	authErrorResponseSchema,
	changePasswordRequestSchema,
	changePasswordResponseSchema,
	cleanupTokensResponseSchema,
	forgotPasswordRequestSchema,
	forgotPasswordResponseSchema,
	loginErrorResponseSchema,
	loginRequestSchema,
	loginResponseSchema,
	logoutResponseSchema,
	meResponseSchema,
	refreshResponseSchema,
	resetPasswordRequestSchema,
	resetPasswordResponseSchema,
} from '@contracts/auth/auth.schemas'
import { errorResponseSchema } from '@contracts/common/error.schemas'
import { createRoute } from '@hono/zod-openapi'
import {
	changePasswordRateLimiter,
	forgotPasswordRateLimiter,
	loginRateLimiter,
	refreshRateLimiter,
	resetPasswordRateLimiter,
} from '../../middlewares/rate-limit.middleware'
import { CRON_SECRET_SCHEME, PASETO_COOKIE_SCHEME, commonResponses } from '../../openapi-config'

export const loginRoute = createRoute({
	method: 'post',
	path: '/login',
	tags: ['Auth'],
	summary: 'Authenticate user',
	description: 'Authenticates a user with email and password. Sets access and refresh tokens as HttpOnly cookies.',
	security: [],
	middleware: [loginRateLimiter] as const,
	request: {
		body: {
			content: { 'application/json': { schema: loginRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Successfully authenticated',
			content: { 'application/json': { schema: loginResponseSchema } },
		},
		400: {
			description: 'Invalid request body',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		401: {
			description:
				'Authentication failed. For ACCOUNT_LOCKED, the body carries `lockedUntil` (ISO-8601) so the client can render a lockout countdown.',
			content: { 'application/json': { schema: loginErrorResponseSchema } },
		},
		429: {
			description: 'Too many requests',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})

export const refreshRoute = createRoute({
	method: 'post',
	path: '/refresh',
	tags: ['Auth'],
	summary: 'Refresh access token',
	description: 'Exchanges refresh token cookie for new access and refresh tokens.',
	security: [],
	middleware: [refreshRateLimiter] as const,
	responses: {
		200: {
			description: 'Tokens refreshed successfully',
			content: { 'application/json': { schema: refreshResponseSchema } },
		},
		401: {
			description: 'Invalid or missing refresh token',
			content: { 'application/json': { schema: authErrorResponseSchema } },
		},
		429: {
			description: 'Too many requests',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})

export const changePasswordRoute = createRoute({
	method: 'post',
	path: '/change-password',
	tags: ['Auth'],
	summary: 'Change password',
	description:
		'Changes the password of the authenticated user. Requires the current password, clears the must-change-password flag, and revokes the other sessions.',
	middleware: [changePasswordRateLimiter] as const,
	request: {
		body: {
			content: { 'application/json': { schema: changePasswordRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Password changed successfully',
			content: { 'application/json': { schema: changePasswordResponseSchema } },
		},
		400: {
			description: 'Invalid request body or incorrect current password',
			content: { 'application/json': { schema: authErrorResponseSchema } },
		},
		429: {
			description: 'Too many requests',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		...commonResponses,
	},
})

export const forgotPasswordRoute = createRoute({
	method: 'post',
	path: '/forgot-password',
	tags: ['Auth'],
	summary: 'Request a password reset',
	description:
		'Sends a password-reset link if an active account exists for the email. Always responds 200 with a neutral message to prevent user enumeration.',
	security: [],
	middleware: [forgotPasswordRateLimiter] as const,
	request: {
		body: {
			content: { 'application/json': { schema: forgotPasswordRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Request accepted (neutral response, regardless of whether the email exists)',
			content: { 'application/json': { schema: forgotPasswordResponseSchema } },
		},
		400: {
			description: 'Invalid request body',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		429: {
			description: 'Too many requests. The `Retry-After` header carries the seconds until the limit resets.',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})

export const resetPasswordRoute = createRoute({
	method: 'post',
	path: '/reset-password',
	tags: ['Auth'],
	summary: 'Reset password with a token',
	description: 'Completes a self-service password reset using the single-use token from the emailed link.',
	security: [],
	middleware: [resetPasswordRateLimiter] as const,
	request: {
		body: {
			content: { 'application/json': { schema: resetPasswordRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			description: 'Password reset successfully',
			content: { 'application/json': { schema: resetPasswordResponseSchema } },
		},
		400: {
			description: 'Invalid request body or an invalid/expired/used token',
			content: { 'application/json': { schema: authErrorResponseSchema } },
		},
		429: {
			description: 'Too many requests. The `Retry-After` header carries the seconds until the limit resets.',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		500: {
			description: 'Reset failed',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})

export const meRoute = createRoute({
	method: 'get',
	path: '/me',
	tags: ['Auth'],
	summary: 'Get current user',
	description: 'Returns the authenticated user with roles and permissions.',
	responses: {
		200: {
			description: 'Current user information',
			content: { 'application/json': { schema: meResponseSchema } },
		},
		...commonResponses,
	},
})

export const logoutRoute = createRoute({
	method: 'post',
	path: '/logout',
	tags: ['Auth'],
	summary: 'Logout user',
	description: 'Revokes all refresh tokens and clears cookies. Always succeeds from client perspective.',
	security: [],
	responses: {
		200: {
			description: 'Logged out successfully',
			content: { 'application/json': { schema: logoutResponseSchema } },
		},
	},
})

export const cleanupTokensRoute = createRoute({
	method: 'get',
	path: '/cleanup-tokens',
	tags: ['Auth'],
	summary: 'Cleanup expired tokens',
	description:
		'Manually triggers expired token cleanup. Accepts either a CRON_SECRET Bearer token or an authenticated user session.',
	security: [{ [PASETO_COOKIE_SCHEME]: [] }, { [CRON_SECRET_SCHEME]: [] }],
	responses: {
		200: {
			description: 'Cleanup result',
			content: { 'application/json': { schema: cleanupTokensResponseSchema } },
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
		500: {
			description: 'Cleanup failed',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})
