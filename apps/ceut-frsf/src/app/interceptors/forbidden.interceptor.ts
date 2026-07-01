import { isPlatformBrowser } from '@angular/common'
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http'
import { inject, Injector, PLATFORM_ID } from '@angular/core'
import { ToastBridgeService } from '@components/toast/toast-bridge.service'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { UIStore } from '@store/ui/ui.store'
import { NotificationType } from '@store/ui/ui.types'
import { catchError, throwError } from 'rxjs'

/**
 * Intercepts HTTP 403 responses and shows a toast notification on any page.
 *
 * The root `ToastBridgeService` (the renderer) is lazily instantiated and only comes alive once a route
 * calls `provideToast()`. A 403 can occur on a route that never does (settings/health, an auth page), so
 * this interceptor activates the bridge on demand (`injector.get(ToastBridgeService)`) when a 403 fires —
 * without it the notification would sit in `UIStore` unrendered. A 403 is meaningful feedback
 * wherever it happens, so the toast is shown on every page by design.
 *
 * - Does NOT redirect — the user stays on the current page
 * - Does NOT suppress the error — stores can still handle it
 * - Logs the 403 for debugging
 *
 * Disabled during SSR because toast notifications require the browser DOM.
 */
export const forbiddenInterceptor: HttpInterceptorFn = (req, next) => {
	const platformId = inject(PLATFORM_ID)

	if (!isPlatformBrowser(platformId)) {
		return next(req)
	}

	const uiStore = inject(UIStore)
	const translation = inject(Translation)
	const loggerService = inject(Logger)
	const injector = inject(Injector)

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			if (error.status === 403) {
				// Side-effect only: instantiating the root bridge makes its effect() live so the toast renders
				// even on routes that never call provideToast() (the bridge is otherwise lazily instantiated on first use).
				injector.get(ToastBridgeService)
				loggerService.error('ForbiddenInterceptor', `403 Forbidden: ${req.method} ${req.url}`)
				uiStore.showNotification({
					type: NotificationType.ERROR,
					message: translation.instant('HTTP.ERRORS.FORBIDDEN'),
				})
			}
			return throwError(() => error)
		}),
	)
}
