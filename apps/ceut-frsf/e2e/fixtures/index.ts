import { test as base, expect } from '@playwright/test'

/**
 * Shared `test`. Two per-test setup concerns, applied to every spec via the `page` fixture:
 *
 * 1. **Distinct client IP on API requests** — the per-IP auth rate limiters (`getClientIp` reads
 *    `x-forwarded-for`) would otherwise trip mid-suite because every request shares `127.0.0.1`. A unique
 *    `x-forwarded-for` per test keeps each test's auth calls under the limit independently. The counter
 *    lives in a worker-scoped fixture (not a module variable), combined with `workerIndex` for uniqueness.
 *    It's added via `page.route` to **`/api` requests only** — NOT page/SSR navigations — because Angular
 *    SSR warns ("trustProxyHeaders not set up") on every `x-forwarded-*` it sees, and only the backend
 *    rate limiter needs it. Spec-level route mocks (registered later) take precedence for their endpoints,
 *    so this never interferes with them.
 * 2. **English** — the app's hardcoded default language is Spanish (`environment.defaultLanguage = 'es'`).
 *    The config's `locale: 'en-US'` only sets `navigator.language`; the app's `resolveInitialLanguage()`
 *    reads `localStorage['app_language']` first, so it must be seeded separately, before any page script.
 */
export const test = base.extend<object, { ipCounter: { next: () => number } }>({
	ipCounter: [
		async ({}, use) => {
			let count = 0
			await use({ next: () => (count += 1) })
		},
		{ scope: 'worker' },
	],
	page: async ({ page, ipCounter }, use) => {
		const { workerIndex } = test.info()
		const forwardedFor = `10.${workerIndex % 256}.${ipCounter.next() % 256}.10`
		await page.route('**/api/**', async (route) => {
			await route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': forwardedFor } })
		})
		await page.addInitScript(() => {
			try {
				window.localStorage.setItem('app_language', 'en')
			} catch {
				// No localStorage in this context — nothing to seed.
			}
		})
		await use(page)
	},
})

export { expect }
