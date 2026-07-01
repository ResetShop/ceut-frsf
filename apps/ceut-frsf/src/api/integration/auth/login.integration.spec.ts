import type { OpenAPIHono } from '@hono/zod-openapi'
import { appEnv } from '../../config/app.env'
import { loginAs } from '../setup/auth-helpers'
import { getTestDb, resetAdminLockout } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('POST /api/auth/login', () => {
	let app: OpenAPIHono
	let adminPassword: string

	beforeAll(() => {
		const password = appEnv.INTEGRATION_TEST_ADMIN_PASSWORD
		if (!password) {
			throw new Error('INTEGRATION_TEST_ADMIN_PASSWORD environment variable is required.')
		}
		adminPassword = password
		app = createTestApp()
	})

	describe('happy path', () => {
		it('returns 200 with user info and sets cookies on valid credentials', async () => {
			const { response, cookies } = await loginAs(app, 'admin@sistema.com', adminPassword)

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body.user).toMatchObject({
				email: 'admin@sistema.com',
				firstName: 'Administrador',
				lastName: 'Sistema',
			})

			expect(cookies.accessToken).toBeTruthy()
			expect(cookies.refreshToken).toBeTruthy()
		})

		it('returns the admin user with non-empty roles + permissions populated', async () => {
			// Guards against regressions of the empty-roles window — frontend
			// `mapLoginResponseToUser` relies on this payload being complete.
			const { response } = await loginAs(app, 'admin@sistema.com', adminPassword)

			expect(response.status).toBe(200)
			const body = await response.json()

			expect(Array.isArray(body.user.roles)).toBe(true)
			expect(body.user.roles.length).toBeGreaterThan(0)

			const adminRole = body.user.roles[0]
			expect(adminRole.code).toBeTruthy()
			expect(adminRole.name).toBeTruthy()
			expect(Array.isArray(adminRole.permissions)).toBe(true)
			expect(adminRole.permissions.length).toBeGreaterThan(0)

			const firstPermission = adminRole.permissions[0]
			expect(firstPermission).toMatchObject({
				module: expect.any(String),
				resource: expect.any(String),
				action: expect.any(String),
			})
		})
	})

	describe('authentication errors', () => {
		it('returns 401 for non-existent email', async () => {
			const { response } = await loginAs(app, 'nonexistent@test.com', 'password')
			expect(response.status).toBe(401)
		})

		it('returns 401 for wrong password', async () => {
			const { response } = await loginAs(app, 'admin@sistema.com', 'wrongpassword')
			expect(response.status).toBe(401)
		})

		it('returns an identical 401 body for an unknown email and a wrong password (no user enumeration)', async () => {
			// Ensure the real account is not locked, so the wrong-password path resolves to
			// INVALID_CREDENTIALS rather than ACCOUNT_LOCKED (which legitimately differs).
			await resetAdminLockout(getTestDb())

			const unknownEmail = await loginAs(app, 'no-such-user@test.com', 'irrelevant-password')
			const wrongPassword = await loginAs(app, 'admin@sistema.com', 'definitely-the-wrong-password')

			expect(unknownEmail.response.status).toBe(401)
			expect(wrongPassword.response.status).toBe(401)

			const unknownBody = await unknownEmail.response.json()
			const wrongBody = await wrongPassword.response.json()

			// The two failure modes must be byte-identical — a differing code or message would let an
			// attacker enumerate which emails have accounts. This is the response-level contract that the
			// timing-safety hash (AuthPasswordService.getDummyHash) backs up at the latency level.
			expect(unknownBody).toEqual(wrongBody)
			expect(JSON.stringify(wrongBody)).not.toContain('admin@sistema.com')
		})
	})

	describe('validation errors', () => {
		it('returns 400 for missing body', async () => {
			const response = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.255.0.1' },
				body: JSON.stringify({}),
			})
			expect(response.status).toBe(400)
		})

		it('returns 400 for invalid email format', async () => {
			const response = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.255.0.2' },
				body: JSON.stringify({ email: 'not-an-email', password: adminPassword }),
			})
			expect(response.status).toBe(400)
		})
	})

	describe('account lockout', () => {
		afterEach(async () => {
			await resetAdminLockout(getTestDb())
		})

		it('locks account after multiple failed login attempts', async () => {
			// Attempt 5 failed logins (default MAX_FAILED_ATTEMPTS = 5)
			for (let i = 0; i < 5; i++) {
				await loginAs(app, 'admin@sistema.com', 'wrongpassword')
			}

			// Next attempt should be locked (even with correct password)
			const { response } = await loginAs(app, 'admin@sistema.com', adminPassword)

			expect(response.status).toBe(401)
			const body = await response.json()
			expect(body.code).toBe('ACCOUNT_LOCKED')
		})

		it('includes a future ISO-8601 lockedUntil in the ACCOUNT_LOCKED response', async () => {
			for (let i = 0; i < 5; i++) {
				await loginAs(app, 'admin@sistema.com', 'wrongpassword')
			}

			const { response } = await loginAs(app, 'admin@sistema.com', adminPassword)
			const body = await response.json()

			expect(body.code).toBe('ACCOUNT_LOCKED')
			expect(typeof body.lockedUntil).toBe('string')
			const lockExpiry = new Date(body.lockedUntil).getTime()
			expect(Number.isFinite(lockExpiry)).toBe(true)
			expect(lockExpiry).toBeGreaterThan(Date.now())
		})
	})

	describe('rate limiting', () => {
		afterEach(async () => {
			await resetAdminLockout(getTestDb())
		})

		it('returns 429 with a Retry-After header once the per-IP login rate limit is exceeded', async () => {
			// Same IP for every call so the per-IP limiter (5 / 15m) trips on the 6th request. Distinct from
			// the per-account lockout — this fires in middleware before the handler reaches checkAccountLockout.
			const fromSameIp = () =>
				app.request('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.97.0.1' },
					body: JSON.stringify({ email: 'admin@sistema.com', password: 'wrongpassword' }),
				})

			let last: Response | undefined
			for (let i = 0; i < 6; i++) last = await fromSameIp()

			expect(last?.status).toBe(429)
			expect(Number(last?.headers.get('Retry-After'))).toBeGreaterThan(0)
		})
	})
})
