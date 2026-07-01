import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('Role endpoints (/api/access/roles)', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>
	let adminRoleId: number

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
		const ids = await getSeededAdminIds(getTestDb())
		adminRoleId = ids.adminRoleId
	})

	// ── List Roles ────────────────────────────────────────────────
	describe('GET /api/access/roles', () => {
		it('returns paginated list of roles', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThan(0)
			expect(body.total).toBeGreaterThanOrEqual(1)
		})

		it('supports search parameter', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles?search=Administrator', {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data.length).toBeGreaterThan(0)
			expect(body.data[0].name).toBe('Administrator')
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/access/roles')
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)

			const response = await authenticatedRequest(app, '/api/access/roles', { cookies: restrictedCookies })
			expect(response.status).toBe(403)
		})
	})

	// ── Create Role ───────────────────────────────────────────────
	describe('POST /api/access/roles', () => {
		it('creates a new role and returns 201', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'Editor', code: 'editor', description: 'Can edit content' },
			})

			expect(response.status).toBe(201)
			const body = await response.json()
			expect(body).toMatchObject({ name: 'Editor', code: 'editor' })
			expect(body.id).toBeDefined()
		})

		it('returns 409 for duplicate role name', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'Editor', code: 'editor_dup' },
			})
			expect(response.status).toBe(409)
		})

		it('returns 409 for duplicate role code', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'Editor Dup', code: 'editor' },
			})
			expect(response.status).toBe(409)
		})

		it('returns 400 for missing required fields', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'MissingCode' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 400 for empty body', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: {},
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/access/roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Unauth', code: 'unauth' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: restrictedCookies,
				body: { name: 'Forbidden', code: 'forbidden' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Get Role ──────────────────────────────────────────────────
	describe('GET /api/access/roles/{id}', () => {
		it('returns role details', async () => {
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			expect((await response.json()).id).toBe(adminRoleId)
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles/99999', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/access/roles/${adminRoleId}`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}`, {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Update Role ───────────────────────────────────────────────
	describe('PUT /api/access/roles/{id}', () => {
		it('updates role and returns updated data', async () => {
			const createResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'Updatable', code: 'updatable' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/access/roles/${created.id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { name: 'Updated Role', description: 'Updated description' },
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.name).toBe('Updated Role')
			expect(body.description).toBe('Updated description')
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles/99999', {
				method: 'PUT',
				cookies: adminCookies,
				body: { name: 'Ghost' },
			})
			expect(response.status).toBe(404)
		})

		it('returns 409 for duplicate name', async () => {
			await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'UniqueNameRole', code: 'unique_name_role' },
			})

			const createResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'AnotherRole', code: 'another_role' },
			})
			const anotherRole = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/access/roles/${anotherRole.id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { name: 'UniqueNameRole' },
			})
			expect(response.status).toBe(409)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/access/roles/${adminRoleId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Unauth' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}`, {
				method: 'PUT',
				cookies: restrictedCookies,
				body: { name: 'Forbidden' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Delete Role ───────────────────────────────────────────────
	describe('DELETE /api/access/roles/{id}', () => {
		it('deletes a removable role', async () => {
			const createResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'Deletable', code: 'deletable' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/access/roles/${created.id}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 403 for non-removable role (Administrator)', async () => {
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(403)
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles/99999', {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request('/api/access/roles/99999', { method: 'DELETE' })
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}`, {
				method: 'DELETE',
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Role Permissions ──────────────────────────────────────────
	describe('GET /api/access/roles/{id}/permissions', () => {
		it('returns paginated permissions for a role', async () => {
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}/permissions`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.data).toBeInstanceOf(Array)
			expect(body.data.length).toBeGreaterThan(0)
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles/99999/permissions', {
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/access/roles/${adminRoleId}/permissions`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}/permissions`, {
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Assign Permissions ────────────────────────────────────────
	describe('PUT /api/access/roles/{id}/permissions', () => {
		it('assigns permissions to a role', async () => {
			const createResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'PermRole', code: 'perm_role' },
			})
			const created = await createResponse.json()

			const permResponse = await authenticatedRequest(app, '/api/access/permissions', {
				cookies: adminCookies,
			})
			const permIds = (await permResponse.json()).data.slice(0, 2).map((p: { id: number }) => p.id)

			const response = await authenticatedRequest(app, `/api/access/roles/${created.id}/permissions`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { permissionIds: permIds },
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBeDefined()
		})

		it('returns 400 for invalid permission IDs', async () => {
			const createResponse = await authenticatedRequest(app, '/api/access/roles', {
				method: 'POST',
				cookies: adminCookies,
				body: { name: 'InvalidPermRole', code: 'invalid_perm_role' },
			})
			const created = await createResponse.json()

			const response = await authenticatedRequest(app, `/api/access/roles/${created.id}/permissions`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { permissionIds: [99999, 99998] },
			})
			expect(response.status).toBe(400)
		})

		it('returns 404 for non-existent role', async () => {
			const response = await authenticatedRequest(app, '/api/access/roles/99999/permissions', {
				method: 'PUT',
				cookies: adminCookies,
				body: { permissionIds: [1] },
			})
			expect(response.status).toBe(404)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`/api/access/roles/${adminRoleId}/permissions`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permissionIds: [1] }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const restrictedCookies = await loginAsRestricted(app)
			const response = await authenticatedRequest(app, `/api/access/roles/${adminRoleId}/permissions`, {
				method: 'PUT',
				cookies: restrictedCookies,
				body: { permissionIds: [1] },
			})
			expect(response.status).toBe(403)
		})
	})
})
