import type { NgpToastOptions } from 'ng-primitives/toast'

/**
 * Default presentation options applied to every toast by `ToastBridgeService`, passed per `show()`.
 *
 * Lives here as a plain typed object — NOT as a DI-provided `NgpToastConfig` — so nothing toast-related
 * is registered app-wide (a `provideToastConfig` would have to sit at the app root for the root-singleton
 * manager to read it). Only per-toast options can be set this way; container-level settings the manager
 * reads from its config token (`maxToasts`, `gap`, `zIndex`) are NOT expressible per `show()` and use
 * ng-primitives' defaults (`maxToasts` is 3, matching this app's intent). This is the single place to tune
 * toast presentation. `duration` is intentionally omitted: it is resolved per notification by the bridge.
 */
export const DEFAULT_TOAST_OPTIONS: Required<Pick<NgpToastOptions, 'placement' | 'dismissible'>> = {
	placement: 'bottom-center',
	dismissible: true,
}
