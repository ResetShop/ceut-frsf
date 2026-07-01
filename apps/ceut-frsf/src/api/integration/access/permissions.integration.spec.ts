import { PERMISSIONS_SEED_DATA } from '@contracts/permission/permission.constants'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { createTestApp } from '../setup/test-app'

describe('Permission endpoints (/api/access/permissions)', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
	})

	describe('GET /api/access/permissions', () => {
		it('returns paginated list of permissions', async () => {
			const response = await authenticatedRequest(app, '/api/access/permissions', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThan(0)
			expect(body.total).toBeGreaterThanOrEqual(PERMISSIONS_SEED_DATA.length)
		})

		it('supports search parameter', async () => {
			const response = await authenticatedRequest(app, '/api/access/permissions?search=roles', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('supports pagination parameters', async () => {
			const response = await authenticatedRequest(app, '/api/access/permissions?offset=0&limit=2', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data.length).toBeLessThanOrEqual(2)
			expect(body.total).toBeGreaterThanOrEqual(PERMISSIONS_SEED_DATA.length)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/access/permissions')
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)

			const response = await authenticatedRequest(app, '/api/access/permissions', { cookies: restrictedCookies })
			expect(response.status).toBe(403)
		})
	})
})
