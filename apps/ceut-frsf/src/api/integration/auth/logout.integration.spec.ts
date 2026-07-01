import type { OpenAPIHono } from '@hono/zod-openapi'
import { loginAsAdmin } from '../setup/auth-helpers'
import { createTestApp } from '../setup/test-app'

describe('POST /api/auth/logout', () => {
	let app: OpenAPIHono

	beforeAll(() => {
		app = createTestApp()
	})

	describe('happy path', () => {
		it('returns 200 and clears cookies on logout with valid refresh token', async () => {
			const adminCookies = await loginAsAdmin(app)

			const response = await app.request('/api/auth/logout', {
				method: 'POST',
				headers: { Cookie: adminCookies.raw },
			})

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body.message).toBe('Logged out successfully')

			const setCookieHeaders = response.headers.getSetCookie()
			const clearHeaders = setCookieHeaders.filter((h) => h.includes('max-age=0') || h.includes('Max-Age=0'))
			expect(clearHeaders).toHaveLength(2)
		})

		it('returns 200 even without refresh token (graceful)', async () => {
			const response = await app.request('/api/auth/logout', {
				method: 'POST',
			})

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body.message).toBe('Logged out successfully')
		})
	})

	describe('token revocation', () => {
		it('revokes refresh token so it cannot be reused after logout', async () => {
			const adminCookies = await loginAsAdmin(app)

			await app.request('/api/auth/logout', {
				method: 'POST',
				headers: { Cookie: adminCookies.raw },
			})

			const refreshResponse = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${adminCookies.refreshToken}` },
			})

			expect(refreshResponse.status).toBe(401)
		})
	})
})
