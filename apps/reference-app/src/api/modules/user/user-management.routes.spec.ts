import { permission } from '@contracts/permission/permission.constants'
import { describe, expect, it } from 'vitest'
import { updateUserRoute, updateUserStatusRoute } from './user-management.routes'

/**
 * `commonResponses` carries a generic `403`, so a route that declares a domain-specific `403`
 * before spreading it loses that description — the later key wins in an object literal, and the
 * generated OpenAPI document ends up documenting the wrong failure mode. This test pins the
 * surviving description so the ordering cannot silently regress.
 */
describe('user management route 403 responses', () => {
	it('should keep the own-account description on updateUserStatusRoute', () => {
		expect(updateUserStatusRoute.responses[403].description).toBe('Cannot change status of own account')
	})

	it('should keep the status/self-edit description on updateUserRoute', () => {
		expect(updateUserRoute.responses[403].description).toBe(
			`Missing ${permission('admin:users:disable')} for a status change, own status change, or own admin role removal`,
		)
	})
})
