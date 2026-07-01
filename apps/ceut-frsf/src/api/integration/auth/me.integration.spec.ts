import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin } from '../setup/auth-helpers'
import { createTestApp } from '../setup/test-app'

describe('GET /api/auth/me', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
	})

	describe('happy path', () => {
		it('returns 200 with user info, roles, and permissions', async () => {
			const response = await authenticatedRequest(app, '/api/auth/me', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body).toMatchObject({
				email: 'admin@sistema.com',
				firstName: 'Administrador',
				lastName: 'Sistema',
			})
			expect(body.roles).toBeInstanceOf(Array)
			expect(body.roles.length).toBeGreaterThan(0)
			expect(body.roles[0].permissions).toBeInstanceOf(Array)
			expect(body.roles[0].permissions.length).toBeGreaterThan(0)
			// Exposed so the forced-change state survives a page reload (the access token omits it).
			expect(body.mustChangePassword).toBe(false)
		})
	})

	describe('authentication errors', () => {
		it('returns 401 when no access token is provided', async () => {
			const response = await app.request('/api/auth/me')
			expect(response.status).toBe(401)
		})

		it('returns 401 when access token is invalid', async () => {
			const response = await app.request('/api/auth/me', {
				headers: { Cookie: 'access_token=invalid-token' },
			})
			expect(response.status).toBe(401)
		})
	})
})
