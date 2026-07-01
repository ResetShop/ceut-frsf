import type { EnvironmentProviders } from '@angular/core'
import { inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core'
import { ToastBridgeService } from './toast-bridge.service'

/**
 * Activates toast rendering for a route by eagerly instantiating the root-singleton `ToastBridgeService`
 * so its `effect()` is live while the route is active. Add it to the `providers` of routes that show toasts.
 */
export function provideToast(): EnvironmentProviders {
	return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(ToastBridgeService))])
}
