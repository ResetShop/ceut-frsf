import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { usersNavigation } from './users.navigation'

describe('users navigation permission identifier', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should reference a valid permission identifier', () => {
		expect(validIdentifiers.has('admin:users:read')).toBe(true)
		expect(usersNavigation.permission).toBe('admin:users:read')
	})
})
