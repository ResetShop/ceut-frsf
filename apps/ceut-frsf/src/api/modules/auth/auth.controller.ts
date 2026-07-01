import {
	type AuthErrorResponse,
	isAuthError,
	LoginErrorCode,
	type LoginErrorResponse,
	PublicAuthErrorCode,
	toLoginErrorResponse,
} from '@contracts/auth/auth.errors'
import type {
	ChangePasswordRequest,
	ChangePasswordResponse,
	ForgotPasswordRequest,
	ForgotPasswordResponse,
	LoginRequest,
	LoginResponse,
	MeResponse,
	RefreshResponse,
	ResetPasswordRequest,
	ResetPasswordResponse,
} from '@contracts/auth/auth.types'
import { createOpenAPIApp, deferAfterResponse, registerRoute } from '@resetshop/hono-core'
import { logger, parseDurationToSeconds } from '@resetshop/util'
import { timingSafeEqual } from 'crypto'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
	ACCESS_TOKEN_COOKIE_NAME,
	MIN_CRON_SECRET_LENGTH,
	REFRESH_TOKEN_COOKIE_NAME,
} from '../../constants/auth.constants'
import { container } from '../../container/container'
import type { AuthenticatedContext } from '../../middlewares/verify-access-token.middleware'
import { buildBaseCookieOptions } from './auth.config'
import {
	changePasswordRoute,
	cleanupTokensRoute,
	forgotPasswordRoute,
	loginRoute,
	logoutRoute,
	meRoute,
	refreshRoute,
	resetPasswordRoute,
} from './auth.routes'

const app = createOpenAPIApp()

/**
 * POST /api/auth/login - Authenticate user
 *
 * Authenticates a user with email and password. Implements account lockout
 * protection after multiple failed login attempts.
 *
 * @route POST /api/auth/login
 * @body {LoginRequest} - Email and password
 *
 * @returns {200} LoginResponse - Successfully authenticated
 * @returns {401} Error - Authentication failed
 *
 * Error responses (401):
 * - "Invalid credentials" - Email/password combination is incorrect
 * - "Account is temporarily locked due to too many failed login attempts" - Account locked after max failed attempts (default: 5)
 * - "Account is disabled" - User account has been disabled by an administrator
 * - "Account is deleted" - User account has been soft-deleted
 *
 * Security features:
 * - Failed login attempt tracking
 * - Automatic account lockout after configurable threshold (AUTH_MAX_FAILED_ATTEMPTS, default: 5)
 * - Configurable lockout duration (AUTH_LOCKOUT_DURATION, default: 15m)
 * - Timing-safe password comparison (prevents timing attacks)
 * - Constant-time response for invalid emails (prevents user enumeration)
 * - Both tokens set as HttpOnly, Secure, SameSite=Strict cookies
 */
registerRoute(app, loginRoute, async (c) => {
	const { authService, authConfig } = container.cradle
	const baseCookieOptions = buildBaseCookieOptions(authConfig)

	try {
		const { email, password }: LoginRequest = c.req.valid('json')

		const response = await authService.authenticate({ email, password })

		// Set tokens as HttpOnly cookies
		setCookie(c, REFRESH_TOKEN_COOKIE_NAME, response.refreshToken, {
			...baseCookieOptions,
			maxAge: parseDurationToSeconds(authConfig.refreshTokenExpiry),
		})
		setCookie(c, ACCESS_TOKEN_COOKIE_NAME, response.token, {
			...baseCookieOptions,
			maxAge: parseDurationToSeconds(authConfig.accessTokenExpiry),
		})

		// Return only user info (both tokens are in cookies)
		return c.json<LoginResponse>(
			{
				user: response.user,
				mustChangePassword: response.mustChangePassword,
			},
			200,
		)
	} catch (error) {
		if (isAuthError(error)) {
			return c.json<LoginErrorResponse>(toLoginErrorResponse(error), 401)
		}

		// Unknown error - use generic response
		return c.json<LoginErrorResponse>({ code: LoginErrorCode.GENERIC, message: 'Authentication failed' }, 401)
	}
})

// POST /api/auth/refresh - Exchange refresh token for new access + refresh tokens
registerRoute(app, refreshRoute, async (c) => {
	const { authService, authConfig } = container.cradle
	const baseCookieOptions = buildBaseCookieOptions(authConfig)

	try {
		// Read refresh token from HttpOnly cookie
		const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE_NAME)

		if (!refreshToken) {
			return c.json<AuthErrorResponse>(
				{ code: PublicAuthErrorCode.TOKEN_INVALID, message: 'No refresh token provided' },
				401,
			)
		}

		const response = await authService.refreshToken(refreshToken)

		// Update both token cookies
		setCookie(c, REFRESH_TOKEN_COOKIE_NAME, response.refreshToken, {
			...baseCookieOptions,
			maxAge: parseDurationToSeconds(authConfig.refreshTokenExpiry),
		})
		setCookie(c, ACCESS_TOKEN_COOKIE_NAME, response.token, {
			...baseCookieOptions,
			maxAge: parseDurationToSeconds(authConfig.accessTokenExpiry),
		})

		// No body needed — tokens are in cookies
		return c.json<RefreshResponse>({}, 200)
	} catch (error) {
		if (isAuthError(error)) {
			return c.json<AuthErrorResponse>({ code: error.publicCode, message: error.message }, 401)
		}

		// Unknown error (e.g., PASETO verification failure)
		return c.json<AuthErrorResponse>({ code: PublicAuthErrorCode.TOKEN_INVALID, message: 'Token refresh failed' }, 401)
	}
})

// POST /api/auth/change-password - Change the authenticated user's password
// Requires the current password; clears must-change-password and revokes the user's other sessions.
// The current session's tokens are preserved (the refresh-token cookie is excluded from revocation).
registerRoute(app, changePasswordRoute, async (c) => {
	const { authService } = container.cradle
	const user = (c as AuthenticatedContext).user

	if (!user) {
		// Defensive only — the global verifyAccessToken middleware already 401s unauthenticated
		// requests with this same { error } shape (errorResponseSchema, via commonResponses).
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const { oldPassword, newPassword }: ChangePasswordRequest = c.req.valid('json')

	try {
		await authService.changePassword({
			userId: Number(user.sub),
			oldPassword,
			newPassword,
			currentRefreshToken: getCookie(c, REFRESH_TOKEN_COOKIE_NAME),
		})

		return c.json<ChangePasswordResponse>({ message: 'Password changed successfully' }, 200)
	} catch (error) {
		// Safe to surface — the caller is already authenticated, so this leaks nothing about other accounts.
		if (isAuthError(error) && error.publicCode === PublicAuthErrorCode.OLD_PASSWORD_MISMATCH) {
			return c.json<AuthErrorResponse>({ code: error.publicCode, message: error.message }, 400)
		}

		logger.error('ChangePassword', 'Password change failed', error)
		// 500 uses the { error } shape (errorResponseSchema, via commonResponses) — matching the
		// /me and cleanup-tokens handlers; the coded OLD_PASSWORD_MISMATCH above keeps { code, message }.
		return c.json({ error: 'Failed to change password' }, 500)
	}
})

// POST /api/auth/forgot-password - Request a self-service password reset
// Public + rate-limited. Always returns 200 with a neutral message regardless of whether the email
// belongs to an active account (no user enumeration).
registerRoute(app, forgotPasswordRoute, async (c) => {
	const { passwordResetService } = container.cradle
	const { email }: ForgotPasswordRequest = c.req.valid('json')

	// Run the lookup + token + email work AFTER the response so the endpoint's latency cannot leak
	// whether the email belongs to an active account: the unknown-email path (a single DB read) and
	// the active-account path (DB writes + SMTP) now return identically and immediately. The neutral
	// 200 below is independent of the outcome, so failures are logged but never surfaced.
	deferAfterResponse(c, () => passwordResetService.requestPasswordReset(email), {
		onError: (error) => logger.error('ForgotPassword', 'requestPasswordReset failed', error),
	})

	return c.json<ForgotPasswordResponse>(
		{ message: 'If an account exists for that email, a password-reset link has been sent.' },
		200,
	)
})

// POST /api/auth/reset-password - Complete a self-service password reset with a token
// Public + rate-limited. Invalid/expired/used tokens return 400 RESET_TOKEN_INVALID (deliberately
// non-specific); the new password is validated against the shared length bounds.
registerRoute(app, resetPasswordRoute, async (c) => {
	const { passwordResetService } = container.cradle
	const { token, newPassword }: ResetPasswordRequest = c.req.valid('json')

	try {
		await passwordResetService.resetPassword(token, newPassword)
		return c.json<ResetPasswordResponse>({ message: 'Your password has been reset. You can now sign in.' }, 200)
	} catch (error) {
		if (isAuthError(error) && error.publicCode === PublicAuthErrorCode.RESET_TOKEN_INVALID) {
			return c.json<AuthErrorResponse>({ code: error.publicCode, message: error.message }, 400)
		}

		logger.error('ResetPassword', 'resetPassword failed', error)
		return c.json({ error: 'Failed to reset password' }, 500)
	}
})

// GET /api/auth/me - Token introspection endpoint
// Returns the current authenticated user's information with roles and permissions
// Useful for verifying token validity, getting user data, and frontend authorization
registerRoute(app, meRoute, async (c) => {
	const { userRoleService, authPasswordService } = container.cradle
	const user = (c as AuthenticatedContext).user

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const userId = Number(user.sub)

	// Roles (with nested permissions) and the must-change flag are independent reads — run in parallel.
	const [roles, mustChangePassword] = await Promise.all([
		userRoleService.getUserRolesWithPermissions(userId),
		authPasswordService.getMustChangePassword(userId),
	])

	return c.json<MeResponse>({
		id: userId,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		roles,
		mustChangePassword,
	})
})

// POST /api/auth/logout - Revoke all refresh tokens for the user
// Uses refresh token from cookie to identify user (no access token needed)
// Always succeeds from client perspective - cleans up what it can
registerRoute(app, logoutRoute, async (c) => {
	const { authService, pasetoService, authConfig } = container.cradle
	const baseCookieOptions = buildBaseCookieOptions(authConfig)

	// Get refresh token before deleting cookie
	const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE_NAME)

	// Always delete both cookies (flags must match creation options for correct targeting)
	deleteCookie(c, ACCESS_TOKEN_COOKIE_NAME, baseCookieOptions)
	deleteCookie(c, REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions)

	try {
		if (!refreshToken) {
			// No refresh token = nothing to revoke, still success
			return c.json({ message: 'Logged out successfully' })
		}

		// Verify refresh token and get user ID
		const payload = await pasetoService.verifyRefreshToken(refreshToken)
		await authService.logout(Number(payload.sub))

		return c.json({ message: 'Logged out successfully' })
	} catch {
		// Even if token verification fails, logout is still "successful"
		// Cookie is already deleted, user is effectively logged out
		return c.json({ message: 'Logged out successfully' })
	}
})

// GET /api/auth/cleanup-tokens - Manually trigger expired token cleanup
// Public endpoint but protected by CRON_SECRET for Vercel Cron Jobs
// Also allows authenticated users to call it manually
registerRoute(app, cleanupTokensRoute, async (c) => {
	const { cronSecret } = container.cradle.authConfig
	const authHeader = c.req.header('Authorization')
	const user = (c as AuthenticatedContext).user

	// Validate CRON_SECRET length (warning logged at startup in cron-jobs.ts)
	const isSecretValid = cronSecret && cronSecret.length >= MIN_CRON_SECRET_LENGTH

	// Check authorization: either valid cron secret or authenticated user
	// Use timing-safe comparison to prevent timing attacks on the secret
	const isValidCronRequest =
		isSecretValid &&
		authHeader &&
		(() => {
			const expected = Buffer.from(`Bearer ${cronSecret}`)
			const actual = Buffer.from(authHeader)
			return expected.length === actual.length && timingSafeEqual(expected, actual)
		})()
	const isAuthenticatedUser = !!user

	if (!isValidCronRequest && !isAuthenticatedUser) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	try {
		const { tokenMaintenanceService } = container.cradle
		const result = await tokenMaintenanceService.cleanupExpiredTokens()

		if (result === null) {
			return c.json({
				message: 'Cleanup already in progress',
				deletedCount: 0,
				incomplete: false,
			})
		}

		return c.json({
			message: result.incomplete ? 'Cleanup incomplete - max batch limit reached' : 'Cleanup completed',
			deletedCount: result.deletedCount,
			incomplete: result.incomplete,
		})
	} catch (error) {
		logger.error('TokenCleanup', 'Cleanup endpoint error', error)
		return c.json({ error: 'Cleanup failed' }, 500)
	}
})

export default app
