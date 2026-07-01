import { isPlatformBrowser } from '@angular/common'
import { HttpInterceptorFn } from '@angular/common/http'
import { inject, PLATFORM_ID } from '@angular/core'

/**
 * Intercepts outgoing HTTP requests to include credentials (cookies)
 * for all API requests. Access token is sent as an HttpOnly cookie.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const platformId = inject(PLATFORM_ID)

	if (!isPlatformBrowser(platformId)) {
		return next(req)
	}

	const url = new URL(req.url, location.origin)
	if (url.pathname.startsWith('/api/')) {
		return next(req.clone({ withCredentials: true }))
	}

	return next(req)
}
