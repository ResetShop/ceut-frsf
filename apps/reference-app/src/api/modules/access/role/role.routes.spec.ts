import { describe, expect, it } from 'vitest'
import { commonResponses } from '../../../openapi-config'
import { assignPermissionsRoute, deleteRoleRoute } from './role.routes'

/**
 * `commonResponses` carries a generic `403`, so a route that declares a domain-specific `403`
 * before spreading it loses that description — the later key wins in an object literal, and the
 * generated OpenAPI document ends up documenting the wrong failure mode. These tests pin the
 * surviving description so the ordering cannot silently regress.
 */
describe('role route 403 responses', () => {
	it('should document the generic forbidden response in commonResponses', () => {
		expect(commonResponses[403].description).toBe('Forbidden - insufficient permissions')
	})

	it('should keep the not-removable description on deleteRoleRoute', () => {
		expect(deleteRoleRoute.responses[403].description).toBe('Role is not removable')
	})

	it('should keep the self-lockout description on assignPermissionsRoute', () => {
		expect(assignPermissionsRoute.responses[403].description).toBe(
			'Self-lockout: removing your own admin permission is not allowed',
		)
	})
})
