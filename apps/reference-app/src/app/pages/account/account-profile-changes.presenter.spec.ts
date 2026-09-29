import { MOCK_TRANSLATIONS } from '@providers/i18n/translation.mock'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'
import { toAccountChangesEntries } from './account-profile-changes.presenter'

const translate = (key: TranslationKey) => MOCK_TRANSLATIONS[key] ?? key

describe('toAccountChangesEntries', () => {
	it('returns no entries when nothing changed', () => {
		expect(toAccountChangesEntries({}, translate)).toEqual([])
	})

	it('labels each change and keeps the values verbatim', () => {
		const entries = toAccountChangesEntries(
			{ firstName: { before: 'Ada', after: 'Grace' }, lastName: { before: 'Lovelace', after: 'Hopper' } },
			translate,
		)

		expect(entries).toEqual([
			{ label: 'First Name', before: 'Ada', after: 'Grace' },
			{ label: 'Last Name', before: 'Lovelace', after: 'Hopper' },
		])
	})

	it('renders a single change', () => {
		expect(toAccountChangesEntries({ lastName: { before: 'Lovelace', after: 'Hopper' } }, translate)).toEqual([
			{ label: 'Last Name', before: 'Lovelace', after: 'Hopper' },
		])
	})

	it('preserves the order of the changes record', () => {
		const entries = toAccountChangesEntries(
			{ lastName: { before: 'Lovelace', after: 'Hopper' }, firstName: { before: 'Ada', after: 'Grace' } },
			translate,
		)

		expect(entries.map((entry) => entry.label)).toEqual(['Last Name', 'First Name'])
	})
})
