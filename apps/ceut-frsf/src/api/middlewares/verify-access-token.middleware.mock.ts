import type { Context } from 'hono'
import type { AuthenticatedContext } from './verify-access-token.middleware'

/** The user payload `verifyAccessToken` attaches to the request context once a token is validated. */
export type AuthenticatedUser = NonNullable<AuthenticatedContext['user']>

/**
 * Attaches an authenticated user to a Hono context the way `verifyAccessToken` does, letting specs
 * exercise permission middleware and protected handlers without minting a real Paseto token.
 *
 * The assertion is confined to this helper on purpose. `AuthenticatedContext` widens `Context` with
 * optional `user`/`permissions` fields, so the downcast is only sound from a bare `Context` — which
 * is what this signature accepts. Inside a route handler the context carries narrower path and env
 * generics that no longer overlap, which is why asserting at the call site needs an `unknown` hop.
 */
export function setAuthenticatedUser(c: Context, user: AuthenticatedUser): void {
	;(c as AuthenticatedContext).user = user
}

/** Reads back the user attached by `setAuthenticatedUser` or the real middleware, without narrowing. */
export function readAuthenticatedUser(c: Context): AuthenticatedUser | undefined {
	return (c as AuthenticatedContext).user
}
