import { permission } from '@contracts/permission/permission.constants'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { authenticatedRequest, loginAs, loginAsAdmin } from '../setup/auth-helpers'
import { getTestDb, seedUserWithPermissions } from '../setup/db-helpers'
import { createTestApp } from '../setup/test-app'

describe('Self-service profile endpoint (PATCH /api/users/me)', () => {
	let app: OpenAPIHono
	let adminCookies: Awaited<ReturnType<typeof loginAsAdmin>>

	beforeAll(async () => {
		app = createTestApp()
		adminCookies = await loginAsAdmin(app)
	})

	/** A fresh, login-capable user holding no `admin:users:*` grant. */
	async function loginNonAdmin(slug: string) {
		const member = await seedUserWithPermissions(getTestDb(), {
			email: `profile-${slug}@test.com`,
			roleCode: `profile_${slug.replace(/-/g, '_')}`,
			permissionNames: [permission('admin:roles:read')],
		})
		const { cookies } = await loginAs(app, member.email, member.password)
		return { userId: member.userId, email: member.email, cookies }
	}

	function patchMe(cookies: Awaited<ReturnType<typeof loginAsAdmin>>, body: unknown) {
		return authenticatedRequest(app, '/api/users/me', { method: 'PATCH', cookies, body })
	}

	describe('success', () => {
		it('lets a user without any admin:users:* permission rename themselves', async () => {
			const member = await loginNonAdmin('non-admin')

			const response = await patchMe(member.cookies, { firstName: 'Renamed', lastName: 'Member' })

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({
				id: member.userId,
				email: member.email,
				firstName: 'Renamed',
				lastName: 'Member',
			})
		})

		it('updates a single field and leaves the other untouched', async () => {
			const member = await loginNonAdmin('single-field')

			const response = await patchMe(member.cookies, { lastName: 'OnlyLast' })

			expect(response.status).toBe(200)
			expect(await response.json()).toMatchObject({ firstName: 'Partial', lastName: 'OnlyLast' })
		})

		it('only ever changes the caller’s own row', async () => {
			const caller = await loginNonAdmin('caller')
			const bystander = await loginNonAdmin('bystander')

			await patchMe(caller.cookies, { firstName: 'Changed' })

			const bystanderView = await authenticatedRequest(app, `/api/users/${bystander.userId}`, {
				cookies: adminCookies,
			})
			expect((await bystanderView.json()).firstName).toBe('Partial')
		})

		it('makes the rename visible to /api/auth/me on the same, unrefreshed token', async () => {
			const member = await loginNonAdmin('fresh-me')

			await patchMe(member.cookies, { firstName: 'FreshName' })

			const me = await authenticatedRequest(app, '/api/auth/me', { cookies: member.cookies })
			expect(me.status).toBe(200)
			expect((await me.json()).firstName).toBe('FreshName')
		})
	})

	describe('rejected input', () => {
		it('returns 400 for an email change and keeps the stored email', async () => {
			const member = await loginNonAdmin('email-change')

			const response = await patchMe(member.cookies, { firstName: 'Renamed', email: 'hijack@test.com' })

			expect(response.status).toBe(400)
			const me = await authenticatedRequest(app, '/api/auth/me', { cookies: member.cookies })
			expect(await me.json()).toMatchObject({ email: member.email, firstName: 'Partial' })
		})

		it('returns 400 for an admin-only field', async () => {
			const member = await loginNonAdmin('admin-field')

			const response = await patchMe(member.cookies, { firstName: 'Renamed', status: 'disabled' })

			expect(response.status).toBe(400)
		})

		it('returns 400 for an empty body', async () => {
			const member = await loginNonAdmin('empty-body')

			const response = await patchMe(member.cookies, {})

			expect(response.status).toBe(400)
		})

		it('returns 400 for an empty name', async () => {
			const member = await loginNonAdmin('empty-name')

			const response = await patchMe(member.cookies, { firstName: '' })

			expect(response.status).toBe(400)
		})
	})

	describe('authentication', () => {
		it('returns 401 without a session', async () => {
			const response = await app.request('/api/users/me', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName: 'Anonymous' }),
			})

			expect(response.status).toBe(401)
		})

		it('returns 401 for a disabled account holding a still-valid token', async () => {
			const member = await loginNonAdmin('disabled')
			await authenticatedRequest(app, `/api/users/${member.userId}/status`, {
				method: 'PATCH',
				cookies: adminCookies,
				body: { status: 'disabled' },
			})

			const response = await patchMe(member.cookies, { firstName: 'Ghost' })

			expect(response.status).toBe(401)
		})
	})
})
