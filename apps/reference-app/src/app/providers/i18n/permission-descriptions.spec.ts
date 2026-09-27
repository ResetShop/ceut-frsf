import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import en from './translations/en'
import es from './translations/es'

describe('permission description translations', () => {
	const identifiers = PERMISSION_DEFINITIONS.map((p) => p.identifier)
	const languages = [
		['en', en.PERMISSIONS.DESCRIPTIONS],
		['es', es.PERMISSIONS.DESCRIPTIONS],
	] as const

	describe.each(languages)('%s', (_language, descriptions) => {
		it.each(identifiers)('has a non-empty description for "%s"', (identifier) => {
			expect(descriptions[identifier]).toBeTruthy()
		})

		it('has no description keys that are absent from the permission catalogue', () => {
			const catalogue = new Set<string>(identifiers)

			expect(Object.keys(descriptions).filter((key) => !catalogue.has(key))).toEqual([])
		})
	})

	it('translates every description into Spanish rather than reusing the English text', () => {
		const untranslated = identifiers.filter(
			(identifier) => es.PERMISSIONS.DESCRIPTIONS[identifier] === en.PERMISSIONS.DESCRIPTIONS[identifier],
		)

		expect(untranslated).toEqual([])
	})
})
