import { UserStatus } from '@contracts/user/user.constants'
import { MOCK_TRANSLATIONS } from '@providers/i18n/translation.mock'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'
import { toConfirmChangesEntries } from './user-edit-changes.presenter'

const translate = (key: TranslationKey) => MOCK_TRANSLATIONS[key] ?? key

describe('toConfirmChangesEntries', () => {
	it('returns no entries when nothing changed', () => {
		expect(toConfirmChangesEntries({}, translate)).toEqual([])
	})

	it('labels profile fields and keeps their values verbatim', () => {
		const entries = toConfirmChangesEntries(
			{
				firstName: { before: 'Ada', after: 'Grace' },
				lastName: { before: 'Lovelace', after: 'Hopper' },
				email: { before: 'ada@example.com', after: 'grace@example.com' },
			},
			translate,
		)

		expect(entries).toEqual([
			{ label: 'First Name', before: 'Ada', after: 'Grace' },
			{ label: 'Last Name', before: 'Lovelace', after: 'Hopper' },
			{ label: 'Email', before: 'ada@example.com', after: 'grace@example.com' },
		])
	})

	it('joins role names and shows the empty placeholder when no roles remain', () => {
		const entries = toConfirmChangesEntries({ roles: { before: ['Admin', 'Editor'], after: [] } }, translate)

		expect(entries).toEqual([{ label: 'Roles', before: 'Admin, Editor', after: 'None' }])
	})

	it('renders a single role name without a separator', () => {
		const entries = toConfirmChangesEntries({ roles: { before: [], after: ['Admin'] } }, translate)

		expect(entries).toEqual([{ label: 'Roles', before: 'None', after: 'Admin' }])
	})

	it('translates status values', () => {
		const entries = toConfirmChangesEntries(
			{ status: { before: UserStatus.ACTIVE, after: UserStatus.DISABLED } },
			translate,
		)

		expect(entries).toEqual([{ label: 'Status', before: 'Active', after: 'Disabled' }])
	})

	it('preserves the order of the changes record', () => {
		const entries = toConfirmChangesEntries(
			{
				email: { before: 'a@example.com', after: 'b@example.com' },
				roles: { before: [], after: ['Admin'] },
				status: { before: UserStatus.DISABLED, after: UserStatus.ACTIVE },
			},
			translate,
		)

		expect(entries.map((entry) => entry.label)).toEqual(['Email', 'Roles', 'Status'])
	})
})
