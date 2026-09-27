import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { permissionDescriptionKey } from './permission-description-key'

describe('permissionDescriptionKey', () => {
	it('builds the DESCRIPTIONS dot-path for an identifier', () => {
		expect(permissionDescriptionKey('admin:users:read')).toBe('PERMISSIONS.DESCRIPTIONS.admin:users:read')
	})

	it('keeps the identifier verbatim so the key matches the translation files', () => {
		const identifiers = PERMISSION_DEFINITIONS.map((p) => p.identifier)

		expect(identifiers.map(permissionDescriptionKey)).toEqual(
			identifiers.map((identifier) => `PERMISSIONS.DESCRIPTIONS.${identifier}`),
		)
	})
})
