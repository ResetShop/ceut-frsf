import type { OpenAPIHono } from '@hono/zod-openapi'
import { authentication } from '@schema/authentication'
import { user } from '@schema/user'
import { eq } from 'drizzle-orm'
import { createPasswordHasher } from '../../services/password/password-hasher'
import { loginAs } from '../setup/auth-helpers'
import { getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('POST /api/auth/change-password', () => {
	let app: OpenAPIHono
	let ipCounter = 0

	// A throwaway user seeded per test, so changing its password never disturbs the shared
	// admin/restricted fixtures other suites depend on.
	const userEmail = 'change-password-user@test.com'
	const originalPassword = 'original-password-123'
	const newPassword = 'a-fresh-secure-password-456'

	beforeAll(() => {
		app = createTestApp()
	})

	beforeEach(async () => {
		const db = getTestDb()
		const passwordHash = await createPasswordHasher()(originalPassword)
		const [createdUser] = await db
			.insert(user)
			.values({ firstName: 'Change', lastName: 'Password', email: userEmail })
			.returning({ id: user.id })
		await db.insert(authentication).values({
			userId: createdUser.id,
			passwordHash,
			failedLoginAttempts: 0,
			mustChangePassword: true,
		})
	})

	afterEach(async () => {
		// Cascades to the authentication + refresh_token rows (both FKs are onDelete: cascade).
		await getTestDb().delete(user).where(eq(user.email, userEmail))
	})

	// Unique IP per call so the per-IP change-password rate limiter never trips across tests.
	async function changePassword(
		cookieHeader: string,
		body: { oldPassword: string; newPassword: string },
	): Promise<Response> {
		return await app.request('/api/auth/change-password', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: cookieHeader,
				'X-Forwarded-For': `10.42.0.${++ipCounter}`,
			},
			body: JSON.stringify(body),
		})
	}

	it('changes the password, clears must-change, rejects the old password and accepts the new one', async () => {
		const { response: loginResponse, cookies } = await loginAs(app, userEmail, originalPassword)
		expect(loginResponse.status).toBe(200)
		expect((await loginResponse.json()).mustChangePassword).toBe(true)

		const changeResponse = await changePassword(cookies.raw, { oldPassword: originalPassword, newPassword })
		expect(changeResponse.status).toBe(200)

		// The old password no longer authenticates.
		const oldLogin = await loginAs(app, userEmail, originalPassword)
		expect(oldLogin.response.status).toBe(401)

		// The new password authenticates and the must-change flag is cleared.
		const newLogin = await loginAs(app, userEmail, newPassword)
		expect(newLogin.response.status).toBe(200)
		expect((await newLogin.response.json()).mustChangePassword).toBe(false)
	})

	it('rejects with OLD_PASSWORD_MISMATCH (400) when the current password is wrong', async () => {
		const { cookies } = await loginAs(app, userEmail, originalPassword)

		const response = await changePassword(cookies.raw, {
			oldPassword: 'not-the-current-password',
			newPassword,
		})

		expect(response.status).toBe(400)
		expect((await response.json()).code).toBe('OLD_PASSWORD_MISMATCH')

		// The password is untouched — the original still logs in.
		const stillWorks = await loginAs(app, userEmail, originalPassword)
		expect(stillWorks.response.status).toBe(200)
	})

	it('rejects with 400 when the new password is shorter than the minimum length', async () => {
		const { cookies } = await loginAs(app, userEmail, originalPassword)

		const response = await changePassword(cookies.raw, { oldPassword: originalPassword, newPassword: 'short' })

		expect(response.status).toBe(400)
	})

	it('revokes other sessions but keeps the session that initiated the change', async () => {
		const sessionA = await loginAs(app, userEmail, originalPassword)
		const sessionB = await loginAs(app, userEmail, originalPassword)

		const changeResponse = await changePassword(sessionA.cookies.raw, { oldPassword: originalPassword, newPassword })
		expect(changeResponse.status).toBe(200)

		// Session B (a different device) is revoked.
		const refreshB = await app.request('/api/auth/refresh', {
			method: 'POST',
			headers: { Cookie: `refresh_token=${sessionB.cookies.refreshToken}` },
		})
		expect(refreshB.status).toBe(401)

		// Session A — the one that changed the password — survives.
		const refreshA = await app.request('/api/auth/refresh', {
			method: 'POST',
			headers: { Cookie: `refresh_token=${sessionA.cookies.refreshToken}` },
		})
		expect(refreshA.status).toBe(200)
	})

	it('returns 401 when no access token cookie is present', async () => {
		const response = await app.request('/api/auth/change-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.42.0.${++ipCounter}` },
			body: JSON.stringify({ oldPassword: originalPassword, newPassword }),
		})

		expect(response.status).toBe(401)
	})
})
