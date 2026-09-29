import type { ProfileChanges, ProfileField } from '@domain/user/user-profile-diff'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'
import type { ConfirmChangesEntry } from '@resetshop/ui/confirm-changes-dialog/confirm-changes-dialog'

type Translate = (key: TranslationKey) => string

/**
 * Turns the raw profile changes into translated before → after rows for `ConfirmChangesDialog`,
 * preserving the display order of the changes record.
 */
export function toAccountChangesEntries(changes: ProfileChanges, translate: Translate): ConfirmChangesEntry[] {
	const fieldLabelKeys = {
		firstName: 'ACCOUNT.PROFILE.FIRST_NAME',
		lastName: 'ACCOUNT.PROFILE.LAST_NAME',
	} as const satisfies Record<ProfileField, TranslationKey>

	return (Object.keys(changes) as ProfileField[]).flatMap((field) => {
		const change = changes[field]
		return change ? [{ label: translate(fieldLabelKeys[field]), before: change.before, after: change.after }] : []
	})
}
