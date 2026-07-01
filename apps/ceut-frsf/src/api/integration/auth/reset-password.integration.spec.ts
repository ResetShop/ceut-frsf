import type { OpenAPIHono } from '@hono/zod-openapi'
import { parseDurationToMs } from '@resetshop/util'
import { authentication } from '@schema/authentication'
import { passwordResetToken } from '@schema/password-reset-token'
import { user } from '@schema/user'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { createPasswordHasher } from '../../services/password/password-hasher'
import { loginAs } from '../setup/auth-helpers'
import { getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

describe('POST /api/auth/reset-password', () => {
	let app: OpenAPIHono
	let userId: number
	let ipCounter = 0

	// Throwaway user so resets never touch the shared admin/restricted fixtures other suites depend on.
	const userEmail = 'reset-flow-user@test.com'
	const originalPassword = 'original-password-123'
	const newPassword = 'a-fresh-secure-password-456'

	beforeAll(() => {
		app = createTestApp()
	})

	beforeEach(async () => {
		const db = getTestDb()
		const passwordHash = await createPasswordHasher()(originalPassword)
		const [created] = await db
			.insert(user)
			.values({ firstName: 'Reset', lastName: 'Flow', email: userEmail })
			.returning({ id: user.id })
		userId = created.id
		await db.insert(authentication).values({ userId, passwordHash, failedLoginAttempts: 0 })
	})

	afterEach(async () => {
		// Cascades to the authentication + password_reset_token rows (FKs are onDelete: cascade).
		await getTestDb().delete(user).where(eq(user.email, userEmail))
	})

	async function seedResetToken(
		rawToken: string,
		overrides: { expiresAt?: Date; usedAt?: Date | null } = {},
	): Promise<void> {
		await getTestDb()
			.insert(passwordResetToken)
			.values({
				userId,
				tokenHash: hashToken(rawToken),
				expiresAt: overrides.expiresAt ?? new Date(Date.now() + parseDurationToMs('1h')),
				usedAt: overrides.usedAt ?? null,
			})
	}

	async function resetPassword(token: string, password: string): Promise<Response> {
		return await app.request('/api/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.51.0.${++ipCounter}` },
			body: JSON.stringify({ token, newPassword: password }),
		})
	}

	it('resets the password with a valid token: new password works, old fails, token is single-use', async () => {
		await seedResetToken('valid-raw-token')

		const response = await resetPassword('valid-raw-token', newPassword)
		expect(response.status).toBe(200)

		expect((await loginAs(app, userEmail, newPassword)).response.status).toBe(200)
		expect((await loginAs(app, userEmail, originalPassword)).response.status).toBe(401)

		// The token is consumed — replaying it fails.
		const replay = await resetPassword('valid-raw-token', 'another-new-password-789')
		expect(replay.status).toBe(400)
		expect((await replay.json()).code).toBe('RESET_TOKEN_INVALID')
	})

	it('rejects an expired token with 400 RESET_TOKEN_INVALID and leaves the password unchanged', async () => {
		await seedResetToken('expired-raw-token', { expiresAt: new Date(Date.now() - parseDurationToMs('1m')) })

		const response = await resetPassword('expired-raw-token', newPassword)

		expect(response.status).toBe(400)
		expect((await response.json()).code).toBe('RESET_TOKEN_INVALID')
		expect((await loginAs(app, userEmail, originalPassword)).response.status).toBe(200)
	})

	it('rejects an already-used token with 400', async () => {
		await seedResetToken('used-raw-token', { usedAt: new Date() })

		const response = await resetPassword('used-raw-token', newPassword)

		expect(response.status).toBe(400)
	})

	it('rejects an unknown token with 400', async () => {
		const response = await resetPassword('never-issued-token', newPassword)

		expect(response.status).toBe(400)
	})

	it('rejects a new password shorter than the minimum length with 400', async () => {
		await seedResetToken('short-pw-token')

		const response = await resetPassword('short-pw-token', 'short')

		expect(response.status).toBe(400)
	})

	it('returns 429 with a Retry-After header once the per-IP rate limit is exceeded', async () => {
		// Same IP for every call so the limiter (5 / 15m) trips on the 6th request.
		const fromSameIp = () =>
			app.request('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.98.0.1' },
				body: JSON.stringify({ token: 'irrelevant', newPassword: 'a-fresh-secure-password' }),
			})

		let last: Response | undefined
		for (let i = 0; i < 6; i++) last = await fromSameIp()

		expect(last?.status).toBe(429)
		expect(Number(last?.headers.get('Retry-After'))).toBeGreaterThan(0)
	})
})
