import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('User management endpoints (/api/users)', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>
	let adminUserId: number
	let adminRoleId: number

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
		const ids = await getSeededAdminIds(getTestDb())
		adminUserId = ids.adminUserId
		adminRoleId = ids.adminRoleId
	})

	// ── List Users ────────────────────────────────────────────────
	describe('GET /api/users', () => {
		it('returns paginated list of users', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('supports search parameter', async () => {
			const response = await authenticatedRequest(app, '/api/users?search=admin', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/users')
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)

			const response = await authenticatedRequest(app, '/api/users', { cookies: restrictedCookies })
			expect(response.status).toBe(403)
		})
	})

	// ── Create User ───────────────────────────────────────────────
	describe('POST /api/users', () => {
		it('creates a new user and returns 201', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: {
					email: 'newuser@test.com',
					firstName: 'New',
					lastName: 'User',
				},
			})

			expect(response.status).toBe(201)
			const body = await response.json()
			expect(body).toMatchObject({
				email: 'newuser@test.com',
				firstName: 'New',
				lastName: 'User',
				status: 'active',
			})
			expect(body.id).toBeDefined()
		})

		it('creates a user with role assignments', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: {
					email: 'withrole@test.com',
					firstName: 'With',
					lastName: 'Role',
					roleIds: [adminRoleId],
				},
			})

			expect(response.status).toBe(201)
			const body = await response.json()

			// Verify roles via GET — the create response may return roles inline or empty
			const getResponse = await authenticatedRequest(app, `/api/users/${body.id}`, {
				cookies: adminCookies,
			})
			const userData = await getResponse.json()
			expect(userData.roles).toBeInstanceOf(Array)
			expect(userData.roles.length).toBeGreaterThan(0)
		})

		it('returns 400 for invalid role IDs and rolls back the user insert', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: {
					email: 'invalidroles@test.com',
					firstName: 'Invalid',
					lastName: 'Roles',
					roleIds: [99999],
				},
			})

			expect(response.status).toBe(400)
			expect((await response.json()).error).toContain('Roles not found')

			// Creation is atomic: the failed role assignment rolled back the user insert, so the
			// same email is still free — a leftover partial user would make this retry 409.
			const retry = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'invalidroles@test.com', firstName: 'Invalid', lastName: 'Roles' },
			})
			expect(retry.status).toBe(201)
		})

		it('returns 409 for duplicate email', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: {
					email: 'newuser@test.com',
					firstName: 'Duplicate',
					lastName: 'User',
				},
			})
			expect(response.status).toBe(409)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'unauth@test.com', firstName: 'U', lastName: 'A' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 400 for missing required fields', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'incomplete@test.com' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 400 for invalid email format', async () => {
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'not-an-email', firstName: 'Bad', lastName: 'Email' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: restrictedCookies,
				body: { email: 'forbidden@test.com', firstName: 'F', lastName: 'B' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Get User ──────────────────────────────────────────────────
	describe('GET /api/users/{id}', () => {
		it('returns user details with roles', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.id).toBe(adminUserId)
			expect(body.roles).toBeInstanceOf(Array)
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Update User ───────────────────────────────────────────────
	describe('PATCH /api/users/{id}', () => {
		it('updates user details', async () => {
			const createResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'updatable@test.com', firstName: 'Updatable', lastName: 'User' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${created.id}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { firstName: 'Updated', lastName: 'Name' },
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.firstName).toBe('Updated')
			expect(body.lastName).toBe('Name')
		})

		it('replaces the user roles when roleIds is provided', async () => {
			const createResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'roleupdate@test.com', firstName: 'Role', lastName: 'Update' },
			})
			const created = await createResponse.json()
			expect(created.roles).toHaveLength(0)

			const response = await authenticatedRequest(app, `/api/users/${created.id}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { roleIds: [adminRoleId] },
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.roles.map((role: { id: number }) => role.id)).toEqual([adminRoleId])
		})

		it('returns 403 when an admin removes their own admin role', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { roleIds: [] },
			})

			expect(response.status).toBe(403)
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999', {
				method: 'PATCH',
				cookies: adminCookies,
				body: { firstName: 'Ghost' },
			})
			expect(response.status).toBe(404)
		})

		it('returns 409 for duplicate email', async () => {
			const create1 = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'unique-email@test.com', firstName: 'Unique', lastName: 'Email' },
			})
			const user1 = await create1.json()

			await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'another-email@test.com', firstName: 'Another', lastName: 'Email' },
			})

			const response = await authenticatedRequest(app, `/api/users/${user1.id}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { email: 'another-email@test.com' },
			})
			expect(response.status).toBe(409)
		})

		it('returns 400 for invalid email format', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { email: 'not-an-email' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Unauth' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				method: 'PATCH',
				cookies: restrictedCookies,
				body: { firstName: 'Forbidden' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Update User Status ────────────────────────────────────────
	describe('PATCH /api/users/{id}/status', () => {
		it('disables a user', async () => {
			const createResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'disableable@test.com', firstName: 'Disable', lastName: 'User' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${created.id}/status`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { status: 'disabled' },
			})

			expect(response.status).toBe(200)
			expect((await response.json()).status).toBe('disabled')
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/status', {
				method: 'PATCH',
				cookies: adminCookies,
				body: { status: 'disabled' },
			})
			expect(response.status).toBe(404)
		})

		it('returns 400 for invalid status value', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/status`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { status: 'invalid_status' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'disabled' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/status`, {
				method: 'PATCH',
				cookies: restrictedCookies,
				body: { status: 'disabled' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Delete User ───────────────────────────────────────────────
	describe('DELETE /api/users/{id}', () => {
		it('soft-deletes a user', async () => {
			const createResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'deleteable@test.com', firstName: 'Delete', lastName: 'User' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${created.id}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999', {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/users/99999', { method: 'DELETE' })
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}`, {
				method: 'DELETE',
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Reset Password ────────────────────────────────────────────
	describe('POST /api/users/{id}/reset-password', () => {
		it('resets the password for an existing user and returns 200', async () => {
			const createResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'reset-target@test.com', firstName: 'Reset', lastName: 'Target' },
			})
			const createdUser = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${createdUser.id}/reset-password`, {
				method: 'POST',
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.message).toBeDefined()
			// The email is dispatched best-effort AFTER the response, so the response carries only the
			// message — no delivery flag — and never the generated password.
			expect(Object.keys(body)).toEqual(['message'])
			expect(body).not.toHaveProperty('password')
		})

		it('returns 404 for a non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/reset-password', {
				method: 'POST',
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/reset-password`, { method: 'POST' })
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/reset-password`, {
				method: 'POST',
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})

		it('returns 403 when an admin targets their own account', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/reset-password`, {
				method: 'POST',
				cookies: adminCookies,
			})
			expect(response.status).toBe(403)
			const body = await response.json()
			expect(body.error).toMatch(/cannot change status of your own account/i)
		})
	})
})
