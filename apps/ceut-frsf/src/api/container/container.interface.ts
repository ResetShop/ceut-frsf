import type { Cradle } from './container.types'

/**
 * Core DI resolution contract shared by Container and InMemoryContainer.
 * Lifecycle methods (verify, use, restore) are intentionally excluded —
 * they belong only to the production Container singleton, not to
 * InMemoryContainer which is a pure data class with no lifecycle concerns.
 */
export interface Container {
	get cradle(): Cradle
	resolve<K extends keyof Cradle>(key: K): Cradle[K]
}
