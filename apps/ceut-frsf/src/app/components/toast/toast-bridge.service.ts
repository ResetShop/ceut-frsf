import { effect, inject, Injectable } from '@angular/core'
import { parseDurationToMs } from '@resetshop/util'
import { DEFAULT_NOTIFICATION_DURATION } from '@store/ui/ui.constants'
import { UIStore } from '@store/ui/ui.store'
import type { NgpToastRef } from 'ng-primitives/toast'
import { NgpToastManager } from 'ng-primitives/toast'
import { ToastNotification } from './toast-notification'
import { DEFAULT_TOAST_OPTIONS } from './toast.config'

/**
 * Bridges `UIStore` notifications to the ng-primitives toast system: watches `UIStore.notifications()`
 * and shows/dismisses toasts via `NgpToastManager` to match.
 *
 * Root singleton — do not list it in any route's `providers`; a route-scoped copy would render every
 * notification a second time. Routes opt into rendering via `provideToast()`.
 */
@Injectable({ providedIn: 'root' })
export class ToastBridgeService {
	private readonly uiStore = inject(UIStore)
	private readonly toastManager = inject(NgpToastManager)
	private readonly activeToasts = new Map<string, NgpToastRef>()

	private readonly syncNotificationsEffect = effect(() => {
		const notifications = this.uiStore.notifications()
		const currentIds = new Set(notifications.map((n) => n.id))

		for (const notification of notifications) {
			if (!this.activeToasts.has(notification.id)) {
				const ref = this.toastManager.show(ToastNotification, {
					...DEFAULT_TOAST_OPTIONS,
					context: notification,
					duration: parseDurationToMs(notification.duration ?? DEFAULT_NOTIFICATION_DURATION),
				})
				this.activeToasts.set(notification.id, ref)
			}
		}

		for (const [id, ref] of this.activeToasts) {
			if (!currentIds.has(id)) {
				void ref.dismiss()
				this.activeToasts.delete(id)
			}
		}
	})
}
