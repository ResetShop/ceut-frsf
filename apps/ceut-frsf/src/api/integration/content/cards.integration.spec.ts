import type { OpenAPIHono } from '@hono/zod-openapi'
import { cardHistory } from '@schema/card-history'
import { permission } from '@schema/permission'
import { role, rolePermission } from '@schema/role'
import { and, asc, eq } from 'drizzle-orm'
import { authenticatedRequest, loginAsAdmin, loginAsRestricted } from '../setup/auth-helpers'
import { getSeededAdminIds, getTestDb } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('Card endpoints (/api/content/cards)', () => {
	const basePath = '/api/content/cards'
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>
	let restrictedCookies: Awaited<ReturnType<typeof loginAsRestricted>>
	let adminUserId: number

	async function createCard(body: Record<string, unknown>): Promise<Response> {
		return authenticatedRequest(app, basePath, { method: 'POST', cookies: adminCookies, body })
	}

	async function createCardId(internalName: string, extra: Record<string, unknown> = {}): Promise<number> {
		const response = await createCard({ internalName, ...extra })
		expect(response.status).toBe(201)
		return (await response.json()).id
	}

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
		restrictedCookies = await loginAsRestricted(app)
		adminUserId = (await getSeededAdminIds(getTestDb())).adminUserId
	})

	// ── Create Card ───────────────────────────────────────────────
	describe('POST /api/content/cards', () => {
		it('creates a card with contract defaults and returns 201', async () => {
			const response = await createCard({ internalName: 'it-create-defaults', title: 'Becas' })

			expect(response.status).toBe(201)
			const body = await response.json()
			expect(body).toMatchObject({
				internalName: 'it-create-defaults',
				title: 'Becas',
				type: 'icon-corner',
				enabled: true,
				isPinned: false,
				pinnedPosition: null,
				deletedAt: null,
			})
			expect(body.id).toBeDefined()
		})

		it('returns 409 for a duplicate internalName', async () => {
			await createCardId('it-create-duplicate')

			const response = await createCard({ internalName: 'it-create-duplicate' })

			expect(response.status).toBe(409)
			expect((await response.json()).error).toContain('internal name')
		})

		it('returns 409 for a duplicate legacyId', async () => {
			await createCardId('it-create-legacy-a', { legacyId: 9001 })

			const response = await createCard({ internalName: 'it-create-legacy-b', legacyId: 9001 })

			expect(response.status).toBe(409)
			expect((await response.json()).error).toContain('legacy ID')
		})

		it('returns 409 rather than 500 to the loser of two concurrent identical creates', async () => {
			const responses = await Promise.all([
				createCard({ internalName: 'it-create-race' }),
				createCard({ internalName: 'it-create-race' }),
			])

			expect(responses.map((r) => r.status).sort()).toEqual([201, 409])
		})

		it('returns 409 when the internalName belongs to a soft-deleted card', async () => {
			const id = await createCardId('it-create-reuse-deleted')
			await authenticatedRequest(app, `${basePath}/${id}`, { method: 'DELETE', cookies: adminCookies })

			const response = await createCard({ internalName: 'it-create-reuse-deleted' })

			expect(response.status).toBe(409)
		})

		it.each([
			['a missing internalName', {}],
			['isPinned without pinnedPosition', { internalName: 'it-create-bad-pin', isPinned: true }],
			['a non-URL imageUrl', { internalName: 'it-create-bad-url', imageUrl: 'not-a-url' }],
			['a javascript: imageUrl', { internalName: 'it-create-js-url', imageUrl: 'javascript:alert(1)' }],
			[
				'an internal link that is not a path',
				{ internalName: 'it-create-js-link', link: { type: 'internal', url: 'javascript:alert(1)' } },
			],
		])('returns 400 for %s', async (_label, body) => {
			const response = await createCard(body)
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(basePath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ internalName: 'it-create-unauth' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const response = await authenticatedRequest(app, basePath, {
				method: 'POST',
				cookies: restrictedCookies,
				body: { internalName: 'it-create-forbidden' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── List Cards ────────────────────────────────────────────────
	describe('GET /api/content/cards', () => {
		beforeAll(async () => {
			await createCardId('it-list-visible', { title: 'Listado visible' })
			await createCardId('it-list-hidden', { title: 'Listado oculto', enabled: false })
			const deletedId = await createCardId('it-list-deleted', { title: 'Listado borrado' })
			await authenticatedRequest(app, `${basePath}/${deletedId}`, { method: 'DELETE', cookies: adminCookies })
		})

		it('returns a paginated list that excludes soft-deleted cards', async () => {
			const response = await authenticatedRequest(app, `${basePath}?search=it-list&limit=50`, {
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			const body = await response.json()
			const names = body.data.map((c: { internalName: string }) => c.internalName)
			expect(names).toEqual(expect.arrayContaining(['it-list-visible', 'it-list-hidden']))
			expect(names).not.toContain('it-list-deleted')
			expect(body.total).toBe(2)
		})

		it('orders cards by position', async () => {
			await createCardId('it-order-second', { position: 20 })
			await createCardId('it-order-first', { position: 10 })

			const response = await authenticatedRequest(app, `${basePath}?search=it-order`, { cookies: adminCookies })

			const body = await response.json()
			expect(body.data.map((c: { internalName: string }) => c.internalName)).toEqual([
				'it-order-first',
				'it-order-second',
			])
		})

		it('searches by title', async () => {
			const response = await authenticatedRequest(app, `${basePath}?search=Listado%20oculto`, {
				cookies: adminCookies,
			})

			const body = await response.json()
			expect(body.data.map((c: { internalName: string }) => c.internalName)).toEqual(['it-list-hidden'])
		})

		it('filters by enabled', async () => {
			const response = await authenticatedRequest(app, `${basePath}?search=it-list&enabled=false`, {
				cookies: adminCookies,
			})

			const body = await response.json()
			expect(body.data.map((c: { internalName: string }) => c.internalName)).toEqual(['it-list-hidden'])
		})

		it('applies offset and limit', async () => {
			const response = await authenticatedRequest(app, `${basePath}?search=it-list&offset=1&limit=1`, {
				cookies: adminCookies,
			})

			const body = await response.json()
			expect(body).toMatchObject({ offset: 1, limit: 1, total: 2 })
			expect(body.data).toHaveLength(1)
		})

		it.each([['enabled=yes'], ['limit=0']])('returns 400 for invalid query %s', async (query) => {
			const response = await authenticatedRequest(app, `${basePath}?${query}`, { cookies: adminCookies })
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(basePath)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const response = await authenticatedRequest(app, basePath, { cookies: restrictedCookies })
			expect(response.status).toBe(403)
		})
	})

	// ── Get Card ──────────────────────────────────────────────────
	describe('GET /api/content/cards/{id}', () => {
		it('returns card details', async () => {
			const id = await createCardId('it-get-found', { title: 'Detalle' })

			const response = await authenticatedRequest(app, `${basePath}/${id}`, { cookies: adminCookies })

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({ id, internalName: 'it-get-found', title: 'Detalle' })
		})

		it('returns 404 for a non-existent card', async () => {
			const response = await authenticatedRequest(app, `${basePath}/999999`, { cookies: adminCookies })
			expect(response.status).toBe(404)
		})

		it('returns 404 for a soft-deleted card', async () => {
			const id = await createCardId('it-get-deleted')
			await authenticatedRequest(app, `${basePath}/${id}`, { method: 'DELETE', cookies: adminCookies })

			const response = await authenticatedRequest(app, `${basePath}/${id}`, { cookies: adminCookies })

			expect(response.status).toBe(404)
		})

		it('returns 400 for an invalid ID', async () => {
			const response = await authenticatedRequest(app, `${basePath}/abc`, { cookies: adminCookies })
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`${basePath}/1`)
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const response = await authenticatedRequest(app, `${basePath}/1`, { cookies: restrictedCookies })
			expect(response.status).toBe(403)
		})
	})

	// ── Update Card ───────────────────────────────────────────────
	describe('PUT /api/content/cards/{id}', () => {
		it('updates the provided fields', async () => {
			const id = await createCardId('it-update-fields', { title: 'Antes' })

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { title: 'Después', type: 'full-image' },
			})

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({
				internalName: 'it-update-fields',
				title: 'Después',
				type: 'full-image',
			})
		})

		it('clears nullable fields sent as null', async () => {
			const id = await createCardId('it-update-clear', {
				title: 'Con título',
				imageUrl: 'https://cdn.example.com/a.png',
				link: { type: 'external', url: 'https://example.com' },
			})

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { title: null, imageUrl: null, link: null },
			})

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({ title: null, imageUrl: null, link: null })
		})

		it('hides a card via enabled=false without deleting it', async () => {
			const id = await createCardId('it-update-hide')

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { enabled: false },
			})
			expect(response.status).toBe(200)

			const getResponse = await authenticatedRequest(app, `${basePath}/${id}`, { cookies: adminCookies })
			expect(getResponse.status).toBe(200)
			expect(await getResponse.json()).toMatchObject({ enabled: false, deletedAt: null })
		})

		it('clears pinnedPosition when unpinning', async () => {
			const id = await createCardId('it-update-unpin', { isPinned: true, pinnedPosition: 1 })

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { isPinned: false },
			})

			expect(await response.json()).toMatchObject({ isPinned: false, pinnedPosition: null })
		})

		it('returns 400 for a lone pinnedPosition on an unpinned card', async () => {
			const id = await createCardId('it-update-bad-pin')

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { pinnedPosition: 2 },
			})

			expect(response.status).toBe(400)
		})

		it('returns 409 when renaming to an existing internalName', async () => {
			await createCardId('it-update-taken')
			const id = await createCardId('it-update-rename')

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { internalName: 'it-update-taken' },
			})

			expect(response.status).toBe(409)
		})

		it('returns 409 when setting a legacyId held by another card', async () => {
			await createCardId('it-update-legacy-holder', { legacyId: 9100 })
			const id = await createCardId('it-update-legacy-target')

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { legacyId: 9100 },
			})

			expect(response.status).toBe(409)
			expect((await response.json()).error).toContain('legacy ID')
		})

		it('returns 404 for a non-existent card', async () => {
			const response = await authenticatedRequest(app, `${basePath}/999999`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { title: 'x' },
			})
			expect(response.status).toBe(404)
		})

		it('returns 400 for an invalid ID', async () => {
			const response = await authenticatedRequest(app, `${basePath}/abc`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { title: 'x' },
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`${basePath}/1`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'x' }),
			})
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const response = await authenticatedRequest(app, `${basePath}/1`, {
				method: 'PUT',
				cookies: restrictedCookies,
				body: { title: 'x' },
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Delete Card ───────────────────────────────────────────────
	describe('DELETE /api/content/cards/{id}', () => {
		it('soft-deletes the card and records created/updated/deleted history by the actor', async () => {
			const id = await createCardId('it-delete-history')
			await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'PUT',
				cookies: adminCookies,
				body: { title: 'Editada' },
			})

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})

			expect(response.status).toBe(200)
			expect((await response.json()).message).toBe('Card deleted successfully')

			const history = await getTestDb()
				.select({ action: cardHistory.action, title: cardHistory.title, changedBy: cardHistory.changedBy })
				.from(cardHistory)
				.where(eq(cardHistory.cardId, id))
				.orderBy(asc(cardHistory.id))
			expect(history).toEqual([
				{ action: 'created', title: null, changedBy: adminUserId },
				{ action: 'updated', title: 'Editada', changedBy: adminUserId },
				{ action: 'deleted', title: 'Editada', changedBy: adminUserId },
			])
		})

		it('returns 404 when deleting an already deleted card', async () => {
			const id = await createCardId('it-delete-twice')
			await authenticatedRequest(app, `${basePath}/${id}`, { method: 'DELETE', cookies: adminCookies })

			const response = await authenticatedRequest(app, `${basePath}/${id}`, {
				method: 'DELETE',
				cookies: adminCookies,
			})

			expect(response.status).toBe(404)
		})

		it('returns 404 for a non-existent card', async () => {
			const response = await authenticatedRequest(app, `${basePath}/999999`, {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(404)
		})

		it('returns 400 for an invalid ID', async () => {
			const response = await authenticatedRequest(app, `${basePath}/abc`, {
				method: 'DELETE',
				cookies: adminCookies,
			})
			expect(response.status).toBe(400)
		})

		it('returns 401 without authentication', async () => {
			const response = await app.request(`${basePath}/1`, { method: 'DELETE' })
			expect(response.status).toBe(401)
		})

		it('returns 403 without required permission', async () => {
			const response = await authenticatedRequest(app, `${basePath}/1`, {
				method: 'DELETE',
				cookies: restrictedCookies,
			})
			expect(response.status).toBe(403)
		})
	})

	// ── Permission isolation ──────────────────────────────────────
	describe('with only content:cards:read granted', () => {
		let restrictedRoleId: number
		let readPermissionId: number
		let cardId: number

		beforeAll(async () => {
			const db = getTestDb()
			const [restrictedRole] = await db.select({ id: role.id }).from(role).where(eq(role.code, 'restricted'))
			const [readPermission] = await db
				.select({ id: permission.id })
				.from(permission)
				.where(eq(permission.name, 'content:cards:read'))
			restrictedRoleId = restrictedRole.id
			readPermissionId = readPermission.id
			await db.insert(rolePermission).values({ roleId: restrictedRoleId, permissionId: readPermissionId })
			cardId = await createCardId('it-read-only')
		})

		afterAll(async () => {
			await getTestDb()
				.delete(rolePermission)
				.where(and(eq(rolePermission.roleId, restrictedRoleId), eq(rolePermission.permissionId, readPermissionId)))
		})

		it('can list and read cards', async () => {
			const list = await authenticatedRequest(app, basePath, { cookies: restrictedCookies })
			const detail = await authenticatedRequest(app, `${basePath}/${cardId}`, { cookies: restrictedCookies })

			expect(list.status).toBe(200)
			expect(detail.status).toBe(200)
		})

		it.each([
			['POST', basePath, { internalName: 'it-read-only-create' }],
			['PUT', 'item', { title: 'x' }],
			['DELETE', 'item', undefined],
		])('is forbidden from %s', async (method, target, body) => {
			const path = target === 'item' ? `${basePath}/${cardId}` : target

			const response = await authenticatedRequest(app, path, { method, cookies: restrictedCookies, body })

			expect(response.status).toBe(403)
		})
	})

	// ── OpenAPI contract ──────────────────────────────────────────
	describe('OpenAPI document', () => {
		it.each([
			['/api/content/cards', 'get', ['200', '400', '401', '403', '500']],
			['/api/content/cards', 'post', ['201', '400', '401', '403', '409', '500']],
			['/api/content/cards/{id}', 'get', ['200', '400', '401', '403', '404', '500']],
			['/api/content/cards/{id}', 'put', ['200', '400', '401', '403', '404', '409', '500']],
			['/api/content/cards/{id}', 'delete', ['200', '400', '401', '403', '404', '500']],
		])('declares every status %s %s can return', async (path, method, statuses) => {
			const response = await app.request('/api/openapi.json')
			const document = await response.json()

			expect(Object.keys(document.paths[path][method].responses).sort()).toEqual(statuses)
		})
	})
})
