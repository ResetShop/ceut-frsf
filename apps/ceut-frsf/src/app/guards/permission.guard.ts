import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { AuthStore } from '@store/auth/auth.store'
import { UIStore } from '@store/ui/ui.store'
import { NotificationType } from '@store/ui/ui.types'

/**
 * Route guard that checks if the current user has the permission specified
 * in `route.data['requiredPermission']`. Redirects to /dashboard if denied,
 * surfacing a translated toast so the user knows why their navigation was
 * blocked (mirrors `forbidden.interceptor.ts`'s 403 toast pattern).
 *
 * This guard is synchronous — it relies on `authGuard` (on the parent route)
 * having already validated the session and populated `currentUser()`.
 *
 * No double-toast: the redirect target `/dashboard` is gated by `authGuard`,
 * not by `permissionGuard`, so the redirected navigation can't re-fire this
 * guard. The toast is emitted exactly once per deny.
 */
export const permissionGuard: CanActivateFn = (route) => {
	const authStore = inject(AuthStore)
	const router = inject(Router)
	const uiStore = inject(UIStore)
	const translation = inject(Translation)
	const requiredPermission = route.data['requiredPermission'] as string | undefined

	if (!requiredPermission) {
		return true
	}

	const user = authStore.currentUser()
	if (user?.hasPermission(requiredPermission)) {
		return true
	}

	uiStore.showNotification({
		type: NotificationType.ERROR,
		message: translation.instant('PERMISSIONS.ERRORS.ACCESS_DENIED'),
	})

	return router.createUrlTree(['/dashboard'])
}
