import { updateProfileRequestSchema } from '@contracts/user/user.schemas'
import type { RouteConfig } from '@hono/zod-openapi'
import { updateProfileRoute } from './user-profile.routes'

describe('updateProfileRoute', () => {
	const route: RouteConfig = updateProfileRoute

	it('requires authentication only — no permission middleware', () => {
		expect(route.middleware).toBeUndefined()
	})

	it('targets the caller through /me, with no id path parameter', () => {
		expect(route.path).toBe('/me')
		expect(route.request?.params).toBeUndefined()
	})

	it('validates the body with the strict profile schema', () => {
		expect(updateProfileRoute.request.body.content['application/json'].schema).toBe(updateProfileRequestSchema)
	})
})
