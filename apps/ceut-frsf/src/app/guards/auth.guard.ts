import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { AuthStore } from '@store/auth/auth.store'
import { catchError, map, of } from 'rxjs'

export const authGuard: CanActivateFn = () => {
	const authStore = inject(AuthStore)
	const router = inject(Router)
	const loginUrl = router.createUrlTree(['/auth/login'])

	return authStore.validateSession().pipe(
		map((): true => true),
		catchError(() => of(loginUrl)),
	)
}
