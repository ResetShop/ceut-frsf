import { inject } from '@angular/core'
import { UIStore } from './ui.store'
import { NotificationType, type UINotification } from './ui.types'

export interface MutationToast {
	/** Mark that a mutation was submitted — arms the handler for the next result. */
	markSubmitted(): void
	/**
	 * Call inside an `untracked()` block with the current loading and error values.
	 * Returns `'success'` or `'error'` when a submitted mutation completes, `null` otherwise.
	 * When deferred, success notifications are stored until {@link flushPending} is called.
	 */
	handleResult(loading: boolean, error: string | null): 'success' | 'error' | null
	/** Show the deferred success notification (call after drawer close animation). */
	flushPending(): void
}

/**
 * Factory that creates a mutation toast handler. Must be called in an injection context
 * (field initializer or constructor).
 *
 * When `deferred` is true (drawer context):
 * - **Success** notifications are stored until `flushPending()` is called (after the drawer close animation)
 * - **Error** notifications are suppressed — the drawer stays open and displays the error inline via its alert banner
 *
 * When `deferred` is false (default, list context):
 * - Both success and error notifications are shown immediately as toasts
 *
 * @param successMessage - Message shown on successful mutation
 * @param options.deferred - When true, enables drawer-aware behavior (deferred success, suppressed error toasts)
 */
export function createMutationToast(successMessage: string, options?: { deferred?: boolean }): MutationToast {
	const uiStore = inject(UIStore)
	const deferred = options?.deferred ?? false
	let submitted = false
	let pending: Omit<UINotification, 'id'> | null = null

	return {
		markSubmitted(): void {
			submitted = true
		},

		handleResult(loading: boolean, error: string | null): 'success' | 'error' | null {
			if (loading || !submitted) return null

			submitted = false

			if (error === null) {
				const notification: Omit<UINotification, 'id'> = { type: NotificationType.SUCCESS, message: successMessage }
				if (deferred) {
					pending = notification
				} else {
					uiStore.showNotification(notification)
				}
				return 'success'
			}

			if (!deferred) {
				uiStore.showNotification({ type: NotificationType.ERROR, message: error })
			}
			return 'error'
		},

		flushPending(): void {
			if (pending) {
				uiStore.showNotification(pending)
				pending = null
			}
		},
	}
}
