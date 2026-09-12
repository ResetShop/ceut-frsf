import { describe, expect, it } from 'vitest'
import { CARD_PERMISSIONS, PERMISSION_DEFINITIONS } from './permission.constants'

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('references only permission identifiers that exist in PERMISSION_DEFINITIONS', () => {
		for (const identifier of CARD_PERMISSIONS) {
			expect(validIdentifiers.has(identifier)).toBe(true)
		}
	})
})

describe('CARD_PERMISSIONS', () => {
	it('derives exactly the four content:cards identifiers — no user or role administration', () => {
		expect(CARD_PERMISSIONS).toEqual([
			'content:cards:create',
			'content:cards:read',
			'content:cards:update',
			'content:cards:delete',
		])
	})

	it('is never empty, so renaming the content:cards module cannot silently grant nothing', () => {
		expect(CARD_PERMISSIONS.length).toBeGreaterThan(0)
	})
})
