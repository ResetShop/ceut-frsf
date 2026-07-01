import { type EnvironmentProviders, inject, makeEnvironmentProviders, type Provider } from '@angular/core'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { NAVIGATION_PERMISSION_CHECK } from '@resetshop/angular-core/navigation/navigation'
import { AuthStore } from '@store/auth/auth.store'
import { HttpAuthApi } from './auth'
import { AuthApi } from './auth.interface'

/**
 * Tag for composable `provideAuth()` features. Add new feature kinds to this
 * union as they're introduced (e.g. `'session-timeout'`, `'token-refresh-config'`).
 */
type AuthFeatureKind = 'navigation-permission-check'

export interface AuthFeature {
	readonly kind: AuthFeatureKind
	readonly providers: Provider[]
}

/**
 * Opt-in feature that wires the navigation library's permission check
 * (`NAVIGATION_PERMISSION_CHECK`) to `AuthStore`.
 *
 * Returns `true` for any permission when no user is logged in. Reason: while
 * the user is being logged out, `AuthStore.currentUser` is cleared
 * synchronously in the logout `tap`, but the sidebar is still mounted until
 * the route transition to `/auth/login` completes. Letting the permission
 * check filter against a null user re-runs `Navigation.sections` as a
 * permission-stripped list, producing a one-frame visible flicker before the
 * route deactivates. Skipping the filter when there's no user eliminates the
 * recomputation. Route-level access remains enforced by `permissionGuard`,
 * so this carries no security impact — `permissionGuard` is what actually
 * decides whether a route activates.
 */
export function withNavigationPermissionCheck(): AuthFeature {
	return {
		kind: 'navigation-permission-check',
		providers: [
			{
				provide: NAVIGATION_PERMISSION_CHECK,
				useFactory: () => {
					const store = inject(AuthStore)
					return (permission: string) => {
						const user = store.currentUser()
						if (!user) return true
						return user.hasPermission(permission)
					}
				},
			},
		],
	}
}

/**
 * Registers the application's auth wiring: the `AuthApi` token bound to its
 * HTTP implementation, plus any opt-in features passed in.
 *
 * @example
 * ```ts
 * provideAuth(withNavigationPermissionCheck())
 * ```
 */
export function provideAuth(...features: AuthFeature[]): EnvironmentProviders {
	return makeEnvironmentProviders([
		{ provide: AuthApi, useExisting: HttpAuthApi },
		// Inversion seam for the @resetshop/angular-core/auth/CurrentUser service.
		// Unconditional — not an opt-in AuthFeature — so any consumer that injects
		// CurrentUser resolves CURRENT_USER_SOURCE without extra wiring.
		{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
		...features.flatMap((feature) => feature.providers),
	])
}
