import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { rolesNavigation } from './roles.navigation'

describe('roles navigation permission identifier', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should reference a valid permission identifier', () => {
		expect(validIdentifiers.has('admin:roles:read')).toBe(true)
		expect(rolesNavigation.permission).toBe('admin:roles:read')
	})
})
