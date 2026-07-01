import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router, type UrlTree } from '@angular/router'
import { AuthStore } from '@store/auth/auth.store'
import { catchError, map, of } from 'rxjs'

export const noAuthGuard: CanActivateFn = () => {
	const authStore = inject(AuthStore)
	const router = inject(Router)
	const dashboardUrl = router.createUrlTree(['/dashboard'])

	return authStore.validateSession().pipe(
		map((): UrlTree => dashboardUrl),
		catchError(() => of(true)),
	)
}
