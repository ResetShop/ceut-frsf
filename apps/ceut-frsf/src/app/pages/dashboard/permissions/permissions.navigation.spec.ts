import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { permissionsNavigation } from './permissions.navigation'

describe('permissions navigation permission identifier', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should reference a valid permission identifier', () => {
		expect(validIdentifiers.has('admin:permissions:read')).toBe(true)
		expect(permissionsNavigation.permission).toBe('admin:permissions:read')
	})
})
