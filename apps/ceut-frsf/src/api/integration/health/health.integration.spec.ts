import type { OpenAPIHono } from '@hono/zod-openapi'
import { createTestApp } from '../setup/test-app'

describe('GET /api/health', () => {
	let app: OpenAPIHono

	beforeAll(() => {
		app = createTestApp()
	})

	it('returns 200 with healthy status when database is connected', async () => {
		const response = await app.request('/api/health/v1')

		expect(response.status).toBe(200)

		const body = await response.json()
		expect(body).toMatchObject({
			status: 'healthy',
			checks: {
				database: expect.objectContaining({
					status: 'healthy',
				}),
			},
		})
	})
})
