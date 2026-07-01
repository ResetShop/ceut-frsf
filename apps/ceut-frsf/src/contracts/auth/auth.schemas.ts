import { z } from 'zod'
import { QUERY_DEFAULTS } from '../common/query.constants'
import { authUserSchema } from '../user/user.schemas'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './auth.constants'

// ============================================================================
// Request Schemas
// ============================================================================

export const loginRequestSchema = z.object({
	email: z.string().email('Invalid email format'),
	password: z.string().min(QUERY_DEFAULTS.FIELD_MIN_LENGTH, 'Password is required'),
})

/**
 * Body for `POST /api/auth/change-password`. The authenticated user supplies their current
 * password plus the new one. `newPassword` must differ from `oldPassword` and satisfy the
 * shared length bounds; the refinement surfaces the mismatch on the `newPassword` field.
 */
export const changePasswordRequestSchema = z
	.object({
		oldPassword: z.string().min(1, 'Current password is required'),
		newPassword: z
			.string()
			.min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
			.max(MAX_PASSWORD_LENGTH, `Password must be no more than ${MAX_PASSWORD_LENGTH} characters`),
	})
	.refine((data) => data.oldPassword !== data.newPassword, {
		message: 'New password must be different from the current password',
		path: ['newPassword'],
	})

/**
 * Body for `POST /api/auth/forgot-password`. Public; always answered with 200 regardless of
 * whether the email belongs to an active account (no user enumeration).
 */
export const forgotPasswordRequestSchema = z.object({
	email: z.string().email('Invalid email format'),
})

/**
 * Body for `POST /api/auth/reset-password`. The raw token from the emailed link plus the new
 * password (same length bounds as change-password).
 */
export const resetPasswordRequestSchema = z.object({
	token: z.string().min(1, 'Reset token is required'),
	newPassword: z
		.string()
		.min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
		.max(MAX_PASSWORD_LENGTH, `Password must be no more than ${MAX_PASSWORD_LENGTH} characters`),
})

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for authentication error responses.
 * Maps to the AuthErrorResponse interface from auth.errors.ts.
 *
 * Named "auth" (not "login") because it represents the system's authentication
 * interaction with the user, not the specific login action.
 * See auth.md § Naming: "login" = user action, "auth" = system interaction.
 */
export const authErrorResponseSchema = z.object({
	code: z.string(),
	message: z.string(),
})

/**
 * Login-specific 401 error shape. Extends the shared auth error with an optional `lockedUntil`
 * (ISO-8601), populated only for `ACCOUNT_LOCKED` so the client can render a lockout countdown.
 */
export const loginErrorResponseSchema = z.object({
	code: z.string(),
	message: z.string(),
	lockedUntil: z.iso.datetime().optional(),
})

export const loginResponseSchema = z.object({
	user: authUserSchema,
	mustChangePassword: z.boolean(),
})

export const refreshResponseSchema = z.object({})

export const changePasswordResponseSchema = z.object({
	message: z.string(),
})

export const forgotPasswordResponseSchema = z.object({
	message: z.string(),
})

export const resetPasswordResponseSchema = z.object({
	message: z.string(),
})

/**
 * `/api/auth/me` returns the authenticated user (the `authUserSchema` shape — full roles +
 * permissions) plus `mustChangePassword`, so a page reload re-derives the forced-change state
 * from the server instead of losing it (the short-lived access token does not carry the flag).
 */
export const meResponseSchema = authUserSchema.extend({
	mustChangePassword: z.boolean(),
})

export const logoutResponseSchema = z.object({
	message: z.string(),
})

export const cleanupTokensResponseSchema = z.object({
	message: z.string(),
	deletedCount: z.number(),
	incomplete: z.boolean(),
})
