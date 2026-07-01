import { isPlatformBrowser } from '@angular/common'
import { HttpInterceptorFn } from '@angular/common/http'
import { inject, PLATFORM_ID, REQUEST } from '@angular/core'

/**
 * Server-side interceptor that forwards browser cookies to outgoing API requests.
 * During SSR, cookies from the original browser request must be explicitly forwarded
 * because HttpClient does not automatically include them.
 */
export const ssrCookieInterceptor: HttpInterceptorFn = (req, next) => {
	const platformId = inject(PLATFORM_ID)
	const request = inject(REQUEST, { optional: true })

	if (isPlatformBrowser(platformId) || !request) {
		return next(req)
	}

	const { pathname } = new URL(req.url, request.url)
	if (pathname.startsWith('/api/')) {
		const cookies = request.headers.get('cookie')
		if (cookies) {
			return next(req.clone({ setHeaders: { Cookie: cookies } }))
		}
	}

	return next(req)
}
