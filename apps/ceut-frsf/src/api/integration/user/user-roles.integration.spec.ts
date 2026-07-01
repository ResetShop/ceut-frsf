import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('User role endpoints (/api/users/{userId}/roles)', () => {
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

	// ── Get User Roles ────────────────────────────────────────────
	describe('GET /api/users/{userId}/roles', () => {
		it('returns paginated roles for a user', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThan(0)
			expect(body.data[0]).toMatchObject({ name: 'Administrator', code: 'admin' })
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/roles', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/roles`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)

			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Get User Permissions ──────────────────────────────────────
	describe('GET /api/users/{userId}/permissions', () => {
		it('returns aggregated permissions for a user', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/permissions`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body).toBeInstanceOf(Array)
			expect(body.length).toBeGreaterThan(0)
			expect(body[0]).toMatchObject({
				name: expect.any(String),
				resource: expect.any(String),
				action: expect.any(String),
			})
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/permissions', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/permissions`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/permissions`, {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Assign Role ───────────────────────────────────────────────
	describe('POST /api/users/{userId}/roles', () => {
		it('assigns a role to a user', async () => {
			const createUserResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'role-assign-target@test.com', firstName: 'Role', lastName: 'Target' },
			})
			const targetUser = await createUserResponse.json()

			const createRoleResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'AssignableRole', code: 'assignable_role' },
			})
			const newRole = await createRoleResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${targetUser.id}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: newRole.id },
			})

			expect(response.status).toBe(201)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 409 when role is already assigned', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: adminRoleId },
			})
			expect(response.status).toBe(409)
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: 1 },
			})
			expect(response.status).toBe(404)
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: 99999 },
			})
			expect(response.status).toBe(404)
		})

		it('returns 400 for missing roleId', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: {},
			})
			expect(response.status).toBe(400)
		})

		it('returns 400 for invalid roleId type', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: 'not-a-number' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/roles`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleId: 1 }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'POST',
				cookies: restrictedCookies,
				body: { roleId: 1 },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Replace User Roles ────────────────────────────────────────
	describe('PUT /api/users/{userId}/roles', () => {
		it('replaces all roles for a user', async () => {
			const createUserResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'role-replace-target@test.com', firstName: 'Replace', lastName: 'Target' },
			})
			const targetUser = await createUserResponse.json()

			const role1Response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'ReplaceRole1', code: 'replace_role_1' },
			})
			const role1 = await role1Response.json()

			const role2Response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'ReplaceRole2', code: 'replace_role_2' },
			})
			const role2 = await role2Response.json()

			const response = await authenticatedRequest(app, `/api/users/${targetUser.id}/roles`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { roleIds: [role1.id, role2.id] },
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 404 for non-existent user', async () => {
			const response = await authenticatedRequest(app, '/api/users/99999/roles', {
				method: 'PUT',
				cookies: adminCookies,
				body: { roleIds: [1] },
			})
			expect(response.status).toBe(404)
		})

		it('returns 400 for missing roleIds', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'PUT',
				cookies: adminCookies,
				body: {},
			})
			expect(response.status).toBe(400)
		})

		it('returns 400 for duplicate roleIds', async () => {
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { roleIds: [1, 1] },
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/roles`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roleIds: [1] }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles`, {
				method: 'PUT',
				cookies: restrictedCookies,
				body: { roleIds: [1] },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Remove Role ───────────────────────────────────────────────
	describe('DELETE /api/users/{userId}/roles/{roleId}', () => {
		it('removes a role from a user', async () => {
			const createUserResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'role-remove-target@test.com', firstName: 'Remove', lastName: 'Target' },
			})
			const targetUser = await createUserResponse.json()

			const createRoleResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'RemovableAssignment', code: 'removable_assignment' },
			})
			const newRole = await createRoleResponse.json()

			await authenticatedRequest(app, `/api/users/${targetUser.id}/roles`, {
				method: 'POST',
				cookies: adminCookies,
				body: { roleId: newRole.id },
			})

			const response = await authenticatedRequest(app, `/api/users/${targetUser.id}/roles/${newRole.id}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 404 when role is not assigned', async () => {
			const createUserResponse = await authenticatedRequest(app, '/api/users', {
				method: 'POST',
				cookies: adminCookies,
				body: { email: 'no-roles@test.com', firstName: 'No', lastName: 'Roles' },
			})
			const targetUser = await createUserResponse.json()

			const response = await authenticatedRequest(app, `/api/users/${targetUser.id}/roles/99999`, {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/users/${adminUserId}/roles/${adminRoleId}`, {
				method: 'DELETE',
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/users/${adminUserId}/roles/${adminRoleId}`, {
				method: 'DELETE',
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})
})
