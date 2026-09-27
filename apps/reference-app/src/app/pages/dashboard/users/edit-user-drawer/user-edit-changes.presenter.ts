import { UserStatus } from '@contracts/user/user.constants'
import type { UserEditChanges, UserEditField, UserEditValues } from '@domain/user-management/user-edit-diff'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'
import type { ConfirmChangesEntry } from '@resetshop/ui/confirm-changes-dialog/confirm-changes-dialog'

type Translate = (key: TranslationKey) => string

/**
 * Turns the raw user-edit changes into translated before → after rows for `ConfirmChangesDialog`,
 * preserving the display order of the changes record.
 */
export function toConfirmChangesEntries(changes: UserEditChanges, translate: Translate): ConfirmChangesEntry[] {
	return (Object.keys(changes) as UserEditField[]).flatMap((field) => toEntry(field, changes[field], translate))
}

function toEntry<F extends UserEditField>(
	field: F,
	change: UserEditChanges[F],
	translate: Translate,
): ConfirmChangesEntry[] {
	if (!change) {
		return []
	}

	const fieldLabelKeys = {
		firstName: 'USERS.DETAIL.PROFILE.FIRST_NAME',
		lastName: 'USERS.DETAIL.PROFILE.LAST_NAME',
		email: 'USERS.DETAIL.PROFILE.EMAIL',
		roles: 'USERS.DETAIL.ROLES.TITLE',
		status: 'USERS.DETAIL.EDIT.STATUS_LABEL',
	} as const satisfies Record<UserEditField, TranslationKey>

	const statusLabelKeys = {
		[UserStatus.ACTIVE]: 'COMMON.STATUS.ACTIVE',
		[UserStatus.DISABLED]: 'COMMON.STATUS.DISABLED',
		[UserStatus.DELETED]: 'COMMON.STATUS.DELETED',
	} as const satisfies Record<UserStatus, TranslationKey>

	const asIs = (value: string) => value

	// Both tables are exhaustive over `UserEditValues`, so a new diffable field does not compile until it
	// has a label and a formatter.
	const fieldFormatters: { [F in UserEditField]: (value: UserEditValues[F], translate: Translate) => string } = {
		firstName: asIs,
		lastName: asIs,
		email: asIs,
		roles: (names, translate) => (names.length > 0 ? names.join(', ') : translate('USERS.DETAIL.EDIT.NONE')),
		status: (status, translate) => translate(statusLabelKeys[status]),
	}

	const format = fieldFormatters[field]
	return [
		{
			label: translate(fieldLabelKeys[field]),
			before: format(change.before, translate),
			after: format(change.after, translate),
		},
	]
}
