import { isPlatformBrowser } from '@angular/common'
import { effect, inject, PLATFORM_ID, signal, type Signal } from '@angular/core'

/**
 * Derives a live countdown from a future ISO-8601 timestamp signal (e.g. an account-lockout expiry or
 * a rate-limit `Retry-After`). Returns the whole seconds remaining as a read-only signal — `0` when the
 * source is null, malformed, already past, or on the server. It ticks every second and self-stops at
 * zero; the interval is torn down via the effect's `onCleanup` (and when the host component is destroyed).
 *
 * MUST be called from an injection context (it registers an `effect` and injects `PLATFORM_ID`) — i.e.
 * as a component field initializer. Shared by the login, forgot-password, and reset-password pages.
 */
export function createCountdown(source: Signal<string | null>): Signal<number> {
	const platformId = inject(PLATFORM_ID)
	const remainingSeconds = signal(0)

	effect((onCleanup) => {
		const iso = source()
		let intervalId: ReturnType<typeof setInterval> | undefined
		onCleanup(() => {
			if (intervalId !== undefined) clearInterval(intervalId)
		})

		// No countdown on the server (no real clock loop) or when nothing is pending.
		if (!iso || !isPlatformBrowser(platformId)) {
			remainingSeconds.set(0)
			return
		}

		const expiry = new Date(iso).getTime()
		if (Number.isNaN(expiry)) {
			remainingSeconds.set(0)
			return
		}

		const compute = () => Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
		const tick = () => {
			const diff = compute()
			remainingSeconds.set(diff)
			if (diff === 0 && intervalId !== undefined) {
				clearInterval(intervalId)
				intervalId = undefined
			}
		}

		const initial = compute()
		remainingSeconds.set(initial)
		if (initial > 0) {
			intervalId = setInterval(tick, 1000)
		}
	})

	return remainingSeconds.asReadonly()
}

/** Formats whole seconds as `mm:ss` (e.g. 75 → "01:15"). */
export function formatCountdown(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, '0')
	const seconds = (totalSeconds % 60).toString().padStart(2, '0')
	return `${minutes}:${seconds}`
}
