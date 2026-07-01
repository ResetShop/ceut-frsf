import type { OpenAPIHono } from '@hono/zod-openapi'
import { parseDurationToMs } from '@resetshop/util'
import { refreshToken } from '@schema/refresh-token'
import { eq, inArray } from 'drizzle-orm'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

// Tokens seeded here share a family so afterEach can remove them without touching tokens
// created by other suites (e.g. via login). Cleanup deletes purely on expiry, so the family
// only matters for teardown, not for the assertion.
const SUITE_TOKEN_FAMILY = 'cleanup-tokens-integration'

// 40 chars — comfortably above MIN_CRON_SECRET_LENGTH (32).
// Must match the CRON_SECRET set in integration setup (env-helpers.ts configureEnvVars),
// which the cronEnv proxy's cached snapshot locks in on first access before any test runs.
const TEST_CRON_SECRET = 'integration-cron-secret-0123456789abcdef'

describe('GET /api/auth/cleanup-tokens', () => {
	let app: OpenAPIHono
	let adminUserId: number

	beforeAll(async () => {
		app = createTestApp()
		const ids = await getSeededAdminIds(getTestDb())
		adminUserId = ids.adminUserId
	})

	afterEach(async () => {
		// Remove any token this suite seeded; the endpoint already deletes the expired ones,
		// this clears the surviving valid token so state does not leak between tests.
		await getTestDb().delete(refreshToken).where(eq(refreshToken.tokenFamily, SUITE_TOKEN_FAMILY))
	})

	it('deletes expired tokens and keeps valid ones when called with a valid CRON_SECRET', async () => {
		const db = getTestDb()
		// Expiries are days in the past so they clear the REFRESH_TOKEN_EXPIRY_BUFFER (1h) cutoff.
		await db.insert(refreshToken).values([
			{
				userId: adminUserId,
				tokenFamily: SUITE_TOKEN_FAMILY,
				tokenHash: 'cleanup-expired-a',
				expiresAt: new Date(Date.now() - parseDurationToMs('7d')),
			},
			{
				userId: adminUserId,
				tokenFamily: SUITE_TOKEN_FAMILY,
				tokenHash: 'cleanup-expired-b',
				expiresAt: new Date(Date.now() - parseDurationToMs('2d')),
			},
			{
				userId: adminUserId,
				tokenFamily: SUITE_TOKEN_FAMILY,
				tokenHash: 'cleanup-valid',
				expiresAt: new Date(Date.now() + parseDurationToMs('7d')),
			},
		])

		const response = await app.request('/api/auth/cleanup-tokens', {
			method: 'GET',
			headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
		})

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.incomplete).toBe(false)
		expect(body.deletedCount).toBeGreaterThanOrEqual(2)

		const survivors = await db
			.select({ tokenHash: refreshToken.tokenHash })
			.from(refreshToken)
			.where(inArray(refreshToken.tokenHash, ['cleanup-expired-a', 'cleanup-expired-b', 'cleanup-valid']))
		const survivingHashes = survivors.map((row) => row.tokenHash)

		expect(survivingHashes).not.toContain('cleanup-expired-a')
		expect(survivingHashes).not.toContain('cleanup-expired-b')
		expect(survivingHashes).toContain('cleanup-valid')
	})

	it('returns 401 when neither a CRON_SECRET bearer token nor a session is provided', async () => {
		const response = await app.request('/api/auth/cleanup-tokens', { method: 'GET' })

		expect(response.status).toBe(401)
	})
})
