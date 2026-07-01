import { type TokenEnv, tokenEnv } from '../../config/token.env'

/**
 * Typed PASETO configuration consumed by {@link PasetoService}.
 *
 * Extracted so the service receives its settings via constructor injection
 * instead of reading `process.env` directly. This lets specs construct multiple
 * service instances with different keys / issuers / expiries (token rotation,
 * expiry windows, issuer-mismatch rejection) without mutating global env state.
 */
export interface PasetoConfig {
	secretKey: string
	issuer: string
	accessTokenExpiry: string
	refreshTokenExpiry: string
	clockTolerance: string
}

/**
 * Maps the validated `tokenEnv` fields onto the typed {@link PasetoConfig} shape.
 *
 * The optional `source` parameter (defaulting to the lazy `tokenEnv` proxy) lets
 * specs drive the mapping from a `parseTokenEnv({...})` result without env
 * mutation, mirroring the `createAuthConfig` pattern. All five fields have
 * schema-level defaults or are required, so they are `string` after parsing —
 * no `??` fallback is needed here.
 */
export function createPasetoConfig(source: TokenEnv = tokenEnv): PasetoConfig {
	return Object.freeze({
		secretKey: source.PASETO_SECRET_KEY,
		issuer: source.PASETO_ISSUER,
		accessTokenExpiry: source.PASETO_ACCESS_TOKEN_EXPIRY,
		refreshTokenExpiry: source.PASETO_REFRESH_TOKEN_EXPIRY,
		clockTolerance: source.PASETO_CLOCK_TOLERANCE,
	})
}
