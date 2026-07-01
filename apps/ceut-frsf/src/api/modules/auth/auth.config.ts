import { type CronEnv, cronEnv } from '../../config/cron.env'
import { type SecurityEnv, securityEnv } from '../../config/security.env'
import { type TokenEnv, tokenEnv } from '../../config/token.env'

export interface AuthConfig {
	/** Whether cookies require HTTPS. Defaults to true; set COOKIE_SECURE=false only for local dev. */
	cookieSecure: boolean
	/** Access token expiry as a duration string (e.g. '15m'). Used for cookie maxAge. */
	accessTokenExpiry: string
	/** Refresh token expiry as a duration string (e.g. '7d'). Used for cookie maxAge and DB storage. */
	refreshTokenExpiry: string
	/** Maximum failed login attempts before account lockout. */
	maxFailedAttempts: number
	/** Account lockout duration as a duration string (e.g. '15m'). Resolve via parseDurationToMs() at point of use. */
	lockoutDuration: string
	/** Bearer secret authorizing scheduled cron-job invocations (e.g. token cleanup). Undefined when unset. */
	cronSecret: string | undefined
}

export function buildBaseCookieOptions(authConfig: AuthConfig) {
	return {
		httpOnly: true,
		secure: authConfig.cookieSecure,
		sameSite: 'Strict' as const,
		path: '/',
	}
}

/**
 * Aggregates the validated `tokenEnv`, `securityEnv`, and `cronEnv` fields onto the typed
 * {@link AuthConfig} shape. `AuthConfig` is a cross-cutting domain object: its fields are sourced
 * from three sub-schemas (cookie/expiry → token, lockout → security, cron secret → cron).
 *
 * The three optional `*Source` parameters (each defaulting to its lazy proxy) let specs drive the
 * mapping from `parse<Domain>Env({...})` results without env mutation. All fields are already at
 * their final types after Zod parsing (booleans, numbers, validated duration strings), so no
 * per-field coercion is needed here.
 */
export function createAuthConfig(
	tokenSource: TokenEnv = tokenEnv,
	securitySource: SecurityEnv = securityEnv,
	cronSource: CronEnv = cronEnv,
): AuthConfig {
	return Object.freeze({
		cookieSecure: tokenSource.COOKIE_SECURE,
		accessTokenExpiry: tokenSource.PASETO_ACCESS_TOKEN_EXPIRY,
		refreshTokenExpiry: tokenSource.PASETO_REFRESH_TOKEN_EXPIRY,
		maxFailedAttempts: securitySource.AUTH_MAX_FAILED_ATTEMPTS,
		lockoutDuration: securitySource.AUTH_LOCKOUT_DURATION,
		cronSecret: cronSource.CRON_SECRET,
	})
}
