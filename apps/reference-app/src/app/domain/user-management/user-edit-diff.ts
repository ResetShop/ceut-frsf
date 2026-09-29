import { UserStatus } from '@contracts/user/user.constants'
import type { UpdateUserRequest } from '@contracts/user/user.types'
import type { IManagedUser } from './managed-user.interface'

/** The editable facets of a managed user, as held by the edit form. */
export interface UserEditFormModel {
	email: string
	firstName: string
	lastName: string
	roleIds: number[]
	status: UserStatus
}

/**
 * The comparable value of each diffable field. Values are raw (not translated): profile fields
 * verbatim, roles as the alphabetically sorted role names, status as the `UserStatus` value.
 */
export interface UserEditValues {
	firstName: string
	lastName: string
	email: string
	roles: string[]
	status: UserStatus
}

export type UserEditField = keyof UserEditValues

/** The fields whose value is free text — every key of `UserEditValues` typed as plain `string`. */
type UserEditTextField = {
	[F in UserEditField]: string extends UserEditValues[F] ? F : never
}[UserEditField]

/**
 * The changed fields only, keyed by field. Keys are inserted in display order, so iterating the
 * record (e.g. `Object.entries`) yields the changes in the order they should be shown.
 */
export type UserEditChanges = { [F in UserEditField]?: { before: UserEditValues[F]; after: UserEditValues[F] } }

export interface UserEditDiff {
	/** Only the changed fields, ready to send as the single update request. */
	patch: UpdateUserRequest
	/** The before/after value of every changed field; empty when nothing changed. */
	changes: UserEditChanges
}

/**
 * Compares the edited form against the persisted user and returns both the minimal update payload
 * and the before/after changes shown for confirmation. Text fields are compared trimmed; roles are
 * compared as a set, so reordering the same roles is not a change. A target status the update endpoint
 * cannot set (`deleted`) is not diffable and never reaches the patch.
 *
 * @param roleNames - Name lookup for every role id the form may contain
 */
export function computeUserEditDiff(
	original: IManagedUser,
	edited: UserEditFormModel,
	roleNames: ReadonlyMap<number, string>,
): UserEditDiff {
	// `satisfies` makes the compiler reject a renamed, removed or added text field until this list matches
	// `UserEditValues`, so the comparison loop cannot silently skip one.
	const textFields = Object.keys({
		firstName: true,
		lastName: true,
		email: true,
	} satisfies Record<UserEditTextField, true>) as UserEditTextField[]
	const patch: UpdateUserRequest = {}
	const changes: UserEditChanges = {}

	for (const field of textFields) {
		const after = edited[field].trim()
		if (after !== original[field]) {
			patch[field] = after
			changes[field] = { before: original[field], after }
		}
	}

	const editedRoleIds = [...new Set(edited.roleIds)]
	if (
		!sameMembers(
			original.roles.map((role) => role.id),
			editedRoleIds,
		)
	) {
		patch.roleIds = editedRoleIds
		changes.roles = {
			before: sortedNames(original.roles.map((role) => role.name)),
			after: sortedNames(editedRoleIds.map((id) => roleNames.get(id) ?? String(id))),
		}
	}

	if (edited.status !== original.status && isEditableStatus(edited.status)) {
		patch.status = edited.status
		changes.status = { before: original.status, after: edited.status }
	}

	return { patch, changes }
}

/** The statuses the update endpoint accepts — `deleted` is reached only through the delete endpoint. */
type EditableUserStatus = NonNullable<UpdateUserRequest['status']>

/** Narrows a status to the values the update endpoint accepts, excluding the terminal `deleted`. */
function isEditableStatus(status: UserStatus): status is EditableUserStatus {
	return status !== UserStatus.DELETED
}

/** Set equality for role ids: same members, regardless of order or repetition. */
function sameMembers(a: readonly number[], b: readonly number[]): boolean {
	const setA = new Set(a)
	return setA.size === new Set(b).size && b.every((id) => setA.has(id))
}

/** Role names in a stable, locale-aware order so the confirmation rows do not depend on query order. */
function sortedNames(names: string[]): string[] {
	return [...names].sort((x, y) => x.localeCompare(y))
}
