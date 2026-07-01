import type { OpenAPIHono } from '@hono/zod-openapi'
import { loginAsAdmin, parseCookies } from '../setup/auth-helpers'
import { createTestApp } from '../setup/test-app'

describe('POST /api/auth/refresh', () => {
	let app: OpenAPIHono

	beforeAll(() => {
		app = createTestApp()
	})

	describe('happy path', () => {
		let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>

		beforeAll(async () => {
			adminCookies = await loginAsAdmin(app)
		})

		it('returns 200 and rotates tokens on valid refresh token', async () => {
			const response = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${adminCookies.refreshToken}` },
			})

			expect(response.status).toBe(200)

			const newCookies = parseCookies(response)
			expect(newCookies.accessToken).toBeTruthy()
			expect(newCookies.refreshToken).toBeTruthy()
			expect(newCookies.accessToken).not.toBe(adminCookies.accessToken)
			expect(newCookies.refreshToken).not.toBe(adminCookies.refreshToken)

			// Verify the old refresh token is rejected after rotation
			const replayResponse = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${adminCookies.refreshToken}` },
			})
			expect(replayResponse.status).toBe(401)
		})
	})

	describe('token reuse detection', () => {
		let initialCookies: Awaited<ReturnType<typeof loginAsAdmin>>

		beforeAll(async () => {
			initialCookies = await loginAsAdmin(app)
		})

		it('revokes the entire token family when a revoked token is replayed', async () => {
			// 1. Refresh to rotate (old token becomes revoked, get new tokens)
			const refreshResponse = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${initialCookies.refreshToken}` },
			})
			expect(refreshResponse.status).toBe(200)
			const newCookies = parseCookies(refreshResponse)

			// 2. Replay the OLD (now revoked) token — should trigger reuse detection
			const replayResponse = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${initialCookies.refreshToken}` },
			})
			expect(replayResponse.status).toBe(401)

			// 3. Use the NEW token — should also fail (entire family revoked)
			const newTokenResponse = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: `refresh_token=${newCookies.refreshToken}` },
			})
			expect(newTokenResponse.status).toBe(401)
		})
	})

	describe('authentication errors', () => {
		it('returns 401 when no refresh token is provided', async () => {
			const response = await app.request('/api/auth/refresh', {
				method: 'POST',
			})

			expect(response.status).toBe(401)
			const body = await response.json()
			expect(body.message).toContain('No refresh token')
		})

		it('returns 401 when refresh token is invalid', async () => {
			const response = await app.request('/api/auth/refresh', {
				method: 'POST',
				headers: { Cookie: 'refresh_token=invalid-token' },
			})

			expect(response.status).toBe(401)
		})
	})
})
