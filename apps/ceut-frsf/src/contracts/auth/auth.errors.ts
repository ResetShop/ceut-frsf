// region Constants and Types

/**
 * Internal authentication error codes for logging and debugging.
 * Includes all error conditions, including security-sensitive ones
 * that should NOT be exposed to the frontend.
 *
 * Pattern rationale: Object with identical keys/values provides:
 * - Namespace access: `InternalAuthErrorCode.USER_NOT_FOUND` (IDE autocomplete)
 * - Runtime iteration: `Object.values(InternalAuthErrorCode)`
 * - Runtime validation: `Object.values(...).includes(str)`
 * - Type union extraction via `keyof typeof`
 *
 * The key/value duplication is intentional - keys provide the namespace,
 * values are the actual strings used at runtime and in logs.
 */
export const InternalAuthErrorCode = Object.freeze({
	// Authentication failures
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

	// Change-password: the supplied current password did not match (safe to expose — the
	// caller is already authenticated, so this leaks no information about another account).
	OLD_PASSWORD_MISMATCH: 'OLD_PASSWORD_MISMATCH',

	// Self-service reset: the reset token is missing, expired, or already used. Deliberately
	// one code for all three states so an attacker cannot probe whether a token exists.
	RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',

	// Security-sensitive (map to INVALID_CREDENTIALS to prevent user enumeration)
	USER_NOT_FOUND: 'USER_NOT_FOUND',
	AUTH_RECORD_NOT_FOUND: 'AUTH_RECORD_NOT_FOUND',

	// Account status
	ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
	ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
	ACCOUNT_DELETED: 'ACCOUNT_DELETED',

	// Token errors (public)
	TOKEN_EXPIRED: 'TOKEN_EXPIRED',
	TOKEN_INVALID: 'TOKEN_INVALID',

	// Token errors (implementation details, map to public token errors)
	TOKEN_MISSING_FAMILY: 'TOKEN_MISSING_FAMILY',
	TOKEN_REVOKED: 'TOKEN_REVOKED',
	TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
	REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
} as const)

export type InternalAuthErrorCode = (typeof InternalAuthErrorCode)[keyof typeof InternalAuthErrorCode]

/**
 * Public authentication error codes exposed to the frontend via HTTP responses.
 * These are safe to show to users and map directly to i18n translation keys.
 *
 * Each code corresponds to a translation key: AUTH.ERRORS.{code}
 * Example: PublicAuthErrorCode.ACCOUNT_LOCKED -> 'AUTH.ERRORS.ACCOUNT_LOCKED'
 *
 * Pattern rationale: Same as InternalAuthErrorCode - the key/value duplication
 * provides namespace access, runtime iteration, and type extraction.
 */
export const PublicAuthErrorCode = Object.freeze({
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
	OLD_PASSWORD_MISMATCH: 'OLD_PASSWORD_MISMATCH',
	RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
	ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
	ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
	ACCOUNT_DELETED: 'ACCOUNT_DELETED',
	TOKEN_EXPIRED: 'TOKEN_EXPIRED',
	TOKEN_INVALID: 'TOKEN_INVALID',
	GENERIC: 'GENERIC',
} as const)

export type PublicAuthErrorCode = (typeof PublicAuthErrorCode)[keyof typeof PublicAuthErrorCode]

/**
 * Error codes that can be returned from the login endpoint.
 * This is a strict subset of PublicAuthErrorCode for security reasons:
 * - INVALID_CREDENTIALS: Generic auth failure (also used for deleted accounts, user enumeration prevention)
 * - ACCOUNT_LOCKED: Account temporarily locked due to failed attempts
 * - GENERIC: Fallback for unexpected errors that don't match the above
 *
 * Other error codes (TOKEN_*, ACCOUNT_DISABLED, etc.) should NEVER be returned
 * from the login flow as they leak information about account state.
 */
export const LoginErrorCode = Object.freeze({
	INVALID_CREDENTIALS: PublicAuthErrorCode.INVALID_CREDENTIALS,
	ACCOUNT_LOCKED: PublicAuthErrorCode.ACCOUNT_LOCKED,
	GENERIC: PublicAuthErrorCode.GENERIC,
} as const)

export type LoginErrorCode = (typeof LoginErrorCode)[keyof typeof LoginErrorCode]

/**
 * Internal error messages for logging service.
 * These provide detailed messages for debugging without exposing sensitive info to users.
 */
export const InternalAuthErrorMessage = Object.freeze({
	[InternalAuthErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
	[InternalAuthErrorCode.OLD_PASSWORD_MISMATCH]: 'Current password does not match',
	[InternalAuthErrorCode.RESET_TOKEN_INVALID]: 'Invalid or expired password reset token',
	[InternalAuthErrorCode.USER_NOT_FOUND]: 'User not found',
	[InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND]: 'Authentication record not found',
	[InternalAuthErrorCode.ACCOUNT_LOCKED]: 'Account temporarily locked due to too many failed attempts',
	[InternalAuthErrorCode.ACCOUNT_DISABLED]: 'Account is disabled',
	[InternalAuthErrorCode.ACCOUNT_DELETED]: 'Account is deleted',
	[InternalAuthErrorCode.TOKEN_EXPIRED]: 'Token has expired',
	[InternalAuthErrorCode.TOKEN_INVALID]: 'Invalid token',
	[InternalAuthErrorCode.TOKEN_MISSING_FAMILY]: 'Invalid refresh token: missing token family',
	[InternalAuthErrorCode.TOKEN_REVOKED]: 'Refresh token has been revoked',
	[InternalAuthErrorCode.TOKEN_REUSE_DETECTED]: 'Refresh token reuse detected: token family revoked',
	[InternalAuthErrorCode.REFRESH_TOKEN_EXPIRED]: 'Refresh token expired',
} as const) satisfies Record<InternalAuthErrorCode, string>

/**
 * Type-safe mapping from internal error codes to public error codes.
 * Security-sensitive errors are mapped to generic public codes to prevent information disclosure.
 */
export const InternalToPublicErrorMap = Object.freeze({
	// Direct mappings
	[InternalAuthErrorCode.INVALID_CREDENTIALS]: PublicAuthErrorCode.INVALID_CREDENTIALS,
	[InternalAuthErrorCode.OLD_PASSWORD_MISMATCH]: PublicAuthErrorCode.OLD_PASSWORD_MISMATCH,
	[InternalAuthErrorCode.RESET_TOKEN_INVALID]: PublicAuthErrorCode.RESET_TOKEN_INVALID,
	[InternalAuthErrorCode.ACCOUNT_LOCKED]: PublicAuthErrorCode.ACCOUNT_LOCKED,
	[InternalAuthErrorCode.ACCOUNT_DISABLED]: PublicAuthErrorCode.ACCOUNT_DISABLED,
	[InternalAuthErrorCode.TOKEN_EXPIRED]: PublicAuthErrorCode.TOKEN_EXPIRED,
	[InternalAuthErrorCode.TOKEN_INVALID]: PublicAuthErrorCode.TOKEN_INVALID,
	// Security mappings (hide sensitive details)
	[InternalAuthErrorCode.USER_NOT_FOUND]: PublicAuthErrorCode.INVALID_CREDENTIALS,
	[InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND]: PublicAuthErrorCode.INVALID_CREDENTIALS,
	[InternalAuthErrorCode.ACCOUNT_DELETED]: PublicAuthErrorCode.INVALID_CREDENTIALS,
	[InternalAuthErrorCode.TOKEN_MISSING_FAMILY]: PublicAuthErrorCode.TOKEN_INVALID,
	[InternalAuthErrorCode.TOKEN_REVOKED]: PublicAuthErrorCode.TOKEN_INVALID,
	[InternalAuthErrorCode.TOKEN_REUSE_DETECTED]: PublicAuthErrorCode.TOKEN_INVALID,
	[InternalAuthErrorCode.REFRESH_TOKEN_EXPIRED]: PublicAuthErrorCode.TOKEN_EXPIRED,
} as const) satisfies Record<InternalAuthErrorCode, PublicAuthErrorCode>

// endregion

// region Interfaces

/**
 * Standard error response structure for auth endpoints.
 */
export interface AuthErrorResponse {
	/** Machine-readable error code for type-safe handling */
	code: PublicAuthErrorCode
	/** Human-readable error message (primarily for debugging) */
	message: string
}

/**
 * Error response structure specifically for the login endpoint.
 * Uses the restricted LoginErrorCode type to enforce at compile-time
 * that only valid login errors can be returned.
 */
export interface LoginErrorResponse {
	code: LoginErrorCode
	message: string
	/** ISO-8601 timestamp until which the account is locked. Only set when `code === ACCOUNT_LOCKED`. */
	lockedUntil?: string
}

// endregion

// region Classes

/**
 * Custom error class for authentication errors.
 * Carries both internal (for logging) and public (for response) error codes.
 */
export class AuthError extends Error {
	public readonly internalCode: InternalAuthErrorCode
	public readonly publicCode: PublicAuthErrorCode
	/** When the error is ACCOUNT_LOCKED, the instant the lock expires (so the response can surface a countdown). */
	public readonly lockedUntil: Date | null

	constructor(internalCode: InternalAuthErrorCode, lockedUntil?: Date | null) {
		super(InternalAuthErrorMessage[internalCode])
		this.name = 'AuthError'
		this.internalCode = internalCode
		this.publicCode = InternalToPublicErrorMap[internalCode]
		this.lockedUntil = lockedUntil ?? null
	}
}

// endregion

// region Functions and Type Guards

/**
 * Type guard to check if an error is an AuthError instance.
 */
export function isAuthError(error: unknown): error is AuthError {
	return error instanceof AuthError
}

/**
 * Gets the internal error message for logging purposes.
 */
export function getInternalErrorMessage(internalCode: InternalAuthErrorCode): string {
	return InternalAuthErrorMessage[internalCode]
}

/**
 * Type guard to check if a PublicAuthErrorCode is a valid LoginErrorCode.
 * Use this to validate error codes before sending them in login responses.
 */
export function isLoginErrorCode(code: PublicAuthErrorCode): code is LoginErrorCode {
	return (Object.values(LoginErrorCode) as string[]).includes(code)
}

/**
 * Converts an AuthError to a safe LoginErrorResponse.
 * Maps both the code and message to prevent information leakage.
 *
 * - Valid login codes preserve the original message
 * - All other codes are mapped to GENERIC with a safe message
 */
export function toLoginErrorResponse(error: AuthError): LoginErrorResponse {
	const code = isLoginErrorCode(error.publicCode) ? error.publicCode : LoginErrorCode.GENERIC
	const response: LoginErrorResponse = {
		code,
		message: isLoginErrorCode(error.publicCode) ? error.message : 'Authentication failed',
	}
	// Surface the lock expiry only for the locked case, so the client can render a live countdown.
	if (code === LoginErrorCode.ACCOUNT_LOCKED && error.lockedUntil) {
		response.lockedUntil = error.lockedUntil.toISOString()
	}
	return response
}

// endregion
