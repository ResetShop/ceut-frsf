/**
 * Minimum length for CRON_SECRET.
 * 32 characters = 256 bits of entropy when hex-encoded.
 */
export const MIN_CRON_SECRET_LENGTH = 32

/**
 * Default maximum failed login attempts before account lockout.
 * Configurable via AUTH_MAX_FAILED_ATTEMPTS environment variable.
 */
export const DEFAULT_MAX_FAILED_ATTEMPTS = 5

/**
 * Default account lockout duration after max failed attempts.
 * Configurable via AUTH_LOCKOUT_DURATION environment variable.
 * Supports duration formats: "15m", "1h", "30s", "1d"
 */
export const DEFAULT_LOCKOUT_DURATION = '15m'

/**
 * Expiry buffer for refresh token cleanup (duration string notation).
 * Tokens must be expired for at least this duration before deletion,
 * preventing race conditions during active refresh operations.
 */
export const REFRESH_TOKEN_EXPIRY_BUFFER = '1h'

/**
 * Default access token expiry (duration string notation).
 * Configurable via PASETO_ACCESS_TOKEN_EXPIRY environment variable.
 */
export const DEFAULT_ACCESS_TOKEN_EXPIRY = '15m'

/**
 * Default refresh token expiry (duration string notation).
 * Configurable via PASETO_REFRESH_TOKEN_EXPIRY environment variable.
 */
export const DEFAULT_REFRESH_TOKEN_EXPIRY = '7d'

/** HttpOnly cookie name for the PASETO refresh token. */
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

/** HttpOnly cookie name for the PASETO access token. */
export const ACCESS_TOKEN_COOKIE_NAME = 'access_token'

/** Rate limit window for login endpoint. */
export const LOGIN_RATE_LIMIT_WINDOW = '15m'

/** Maximum login attempts per window. */
export const LOGIN_RATE_LIMIT_MAX = 5

/** Rate limit window for refresh endpoint. */
export const REFRESH_RATE_LIMIT_WINDOW = '1m'

/** Maximum refresh attempts per window. */
export const REFRESH_RATE_LIMIT_MAX = 10

/**
 * Default rate-limit window for the change-password endpoint (duration string).
 * Overridable via `AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW`; resolved with `parseDurationToMs()`.
 */
export const DEFAULT_CHANGE_PASSWORD_RATE_LIMIT_WINDOW = '15m'

/**
 * Default maximum change-password attempts per window.
 * Overridable via `AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX`.
 */
export const DEFAULT_CHANGE_PASSWORD_RATE_LIMIT_MAX = 5

/**
 * Expiry for self-service password-reset tokens (duration string).
 * Tokens are single-use and rejected after this window.
 */
export const PASSWORD_RESET_TOKEN_EXPIRY = '1h'

/** Rate limit window for the forgot-password endpoint. */
export const FORGOT_PASSWORD_RATE_LIMIT_WINDOW = '15m'

/** Maximum forgot-password requests per window. */
export const FORGOT_PASSWORD_RATE_LIMIT_MAX = 5

/** Rate limit window for the reset-password endpoint. */
export const RESET_PASSWORD_RATE_LIMIT_WINDOW = '15m'

/** Maximum reset-password attempts per window. */
export const RESET_PASSWORD_RATE_LIMIT_MAX = 5

/** Frontend path where users complete a password reset (raw token passed as the `token` query param). */
export const PASSWORD_RESET_PATH = '/auth/reset-password/confirm'
