import type { UpdateProfileRequest } from '@contracts/user/user.types'
import type { IUser } from './user.interface'

/** The fields a user may edit on their own profile, as held by the form. */
export interface ProfileFormModel {
	firstName: string
	lastName: string
}

export type ProfileField = keyof ProfileFormModel

/**
 * The changed fields only, keyed by field and inserted in display order. Values are raw — the
 * presenter that renders them owns translation.
 */
export type ProfileChanges = { [F in ProfileField]?: { before: ProfileFormModel[F]; after: ProfileFormModel[F] } }

export interface ProfileDiff {
	/** Only the changed fields, ready to send as the update request. */
	patch: UpdateProfileRequest
	/** The before/after value of every changed field; empty when nothing changed. */
	changes: ProfileChanges
}

/**
 * Compares the edited form against the signed-in user and returns both the minimal update payload
 * and the before/after changes shown for confirmation. Values are compared trimmed.
 */
export function computeProfileDiff(original: IUser, edited: ProfileFormModel): ProfileDiff {
	// `satisfies` makes the compiler reject a renamed, removed or added field until this list matches the type.
	const profileFields = Object.keys({
		firstName: true,
		lastName: true,
	} satisfies Record<ProfileField, true>) as ProfileField[]
	const patch: UpdateProfileRequest = {}
	const changes: ProfileChanges = {}

	for (const field of profileFields) {
		const after = edited[field].trim()
		if (after !== original[field]) {
			patch[field] = after
			changes[field] = { before: original[field], after }
		}
	}

	return { patch, changes }
}
