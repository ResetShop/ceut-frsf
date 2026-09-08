import { describe, expect, it } from 'vitest'
import { PERMISSION_DEFINITIONS } from '../contracts/permission/permission.constants'
import { EDITOR_ROLE_PERMISSIONS } from './seed-editor-role.constants'

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('references only permission identifiers that exist in PERMISSION_DEFINITIONS', () => {
		for (const identifier of EDITOR_ROLE_PERMISSIONS) {
			expect(validIdentifiers.has(identifier)).toBe(true)
		}
	})

	it('grants exactly the four content:cards:* permissions — no user or role administration', () => {
		expect(EDITOR_ROLE_PERMISSIONS).toEqual([
			'content:cards:create',
			'content:cards:read',
			'content:cards:update',
			'content:cards:delete',
		])
	})
})
