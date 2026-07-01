import type { Container } from './container.interface'
import type { Cradle } from './container.types'

/**
 * Type that allows partial implementations of each service in the Cradle.
 * Useful for tests where you only need to mock specific methods.
 */
type MockCradle = {
	[K in keyof Cradle]?: Partial<Cradle[K]>
}

export class InMemoryContainer implements Container {
	constructor(private readonly mockCradle: MockCradle) {}

	public get cradle(): Cradle {
		// REASON: MockCradle is partial — the Proxy traps access and throws for unmocked services at runtime
		return new Proxy(this.mockCradle as Cradle, {
			get(target, prop: string | symbol) {
				if (prop in target) {
					return target[prop as keyof Cradle]
				}
				throw new Error(`Test mock missing for service: ${String(prop)}`)
			},
		})
	}

	public resolve<K extends keyof Cradle>(key: K): Cradle[K] {
		if (key in this.mockCradle) {
			// REASON: Key presence verified by the guard above; Partial<Cradle[K]> is safe to widen here
			return this.mockCradle[key] as Cradle[K]
		}
		throw new Error(`Test mock missing for service: ${String(key)}`)
	}
}
