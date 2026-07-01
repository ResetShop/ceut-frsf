import { describe, expect, it } from 'vitest'
import { app } from './server'

/**
 * These tests guard the lazy-init contract for the CORS middleware:
 * importing the server bundle must not read env at module-eval (the env proxies
 * `process.exit(1)` on missing values, which would abort the test worker), and the
 * cors() middleware must be built and applied on the first request instead.
 */
describe('server module', () => {
	it('exports the app without reading env at import time', () => {
		// If importing ./server triggered an env-proxy read with missing values,
		// the worker would have exited before reaching this assertion.
		expect(app).toBeDefined()
	})

	it('builds and applies the cors() middleware on the first request', async () => {
		// happy-dom (the vitest env) strips the forbidden `Origin` request header, so the
		// origin-echo header cannot be asserted here. The preflight method/max-age headers are
		// origin-independent — their presence proves the lazily-built cors() middleware ran.
		const res = await app.request('/api/auth/login', { method: 'OPTIONS' })

		expect(res.headers.get('access-control-allow-methods')).toContain('POST')
		expect(res.headers.get('access-control-max-age')).not.toBeNull()
	})
})
