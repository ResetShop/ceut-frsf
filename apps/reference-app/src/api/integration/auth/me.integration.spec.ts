import { permission } from '@contracts/permission/permission.constants'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { user } from '@schema/user'
import { eq } from 'drizzle-orm'
import { authenticatedRequest, loginAs, loginAsAdmin } from '../setup/auth-helpers'
import { getTestDb, seedUserWithPermissions } from '../setup/db-helpers'
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

	describe('identity freshness', () => {
		it('reflects a rename made after the access token was issued', async () => {
			const member = await seedUserWithPermissions(getTestDb(), {
				email: 'me-renamed@test.com',
				roleCode: 'me_renamed_member',
				permissionNames: [permission('admin:users:read')],
			})
			const { cookies: memberCookies } = await loginAs(app, member.email, member.password)

			const rename = await authenticatedRequest(app, `/api/users/${member.userId}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { firstName: 'Renamed', lastName: 'Member' },
			})
			expect(rename.status).toBe(200)

			const response = await authenticatedRequest(app, '/api/auth/me', { cookies: memberCookies })

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({
				id: member.userId,
				firstName: 'Renamed',
				lastName: 'Member',
			})
		})

		it('returns 401 when the account behind a still-valid token no longer exists', async () => {
			const member = await seedUserWithPermissions(getTestDb(), {
				email: 'me-removed@test.com',
				roleCode: 'me_removed_member',
				permissionNames: [permission('admin:users:read')],
			})
			const { cookies: memberCookies } = await loginAs(app, member.email, member.password)

			await getTestDb().delete(user).where(eq(user.id, member.userId))

			const response = await authenticatedRequest(app, '/api/auth/me', { cookies: memberCookies })
			expect(response.status).toBe(401)
		})
	})

	describe('account status', () => {
		async function loginFreshMember(email: string, roleCode: string) {
			const member = await seedUserWithPermissions(getTestDb(), {
				email,
				roleCode,
				permissionNames: [permission('admin:users:read')],
			})
			const { cookies } = await loginAs(app, member.email, member.password)
			return { userId: member.userId, cookies }
		}

		it('returns 401 once the account is disabled, even with a still-valid token', async () => {
			const member = await loginFreshMember('me-disabled@test.com', 'me_disabled_member')

			const disable = await authenticatedRequest(app, `/api/users/${member.userId}/status`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { status: 'disabled' },
			})
			expect(disable.status).toBe(200)

			const response = await authenticatedRequest(app, '/api/auth/me', { cookies: member.cookies })
			expect(response.status).toBe(401)
		})

		it('returns 401 once the account is soft-deleted, even with a still-valid token', async () => {
			const member = await loginFreshMember('me-deleted@test.com', 'me_deleted_member')

			const remove = await authenticatedRequest(app, `/api/users/${member.userId}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(remove.status).toBe(200)

			const response = await authenticatedRequest(app, '/api/auth/me', { cookies: member.cookies })
			expect(response.status).toBe(401)
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
