import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { AuthStore } from '@store/auth/auth.store'

/**
 * Redirects to the change-password page when the authenticated user must change their password.
 *
 * Intended to run AFTER `authGuard` in a route's `canActivate` array. Angular executes
 * `canActivate` guards sequentially, so by the time this guard runs `authGuard.validateSession()`
 * has already populated `mustChangePassword` from `/api/auth/me` — this guard adds no extra
 * round-trip, it just reads the freshly-patched store signal. The change-password route itself
 * must NOT use this guard (it would redirect to itself), only `authGuard`.
 */
export const forcedPasswordChangeGuard: CanActivateFn = () => {
	const authStore = inject(AuthStore)
	const router = inject(Router)

	return authStore.mustChangePassword() ? router.createUrlTree(['/auth/change-password']) : true
}
