import { UserStatus } from '@contracts/user/user.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { createMockManagedUser } from '@providers/users/users.mock'
import { mapManagedUserResponse } from './managed-user.mapper'
import { computeUserEditDiff, type UserEditFormModel } from './user-edit-diff'

const ADMIN = {
	id: 1,
	name: 'Admin',
	code: 'admin',
	description: null,
	removable: false,
	createdAt: null,
	updatedAt: null,
}
const EDITOR = {
	id: 2,
	name: 'Editor',
	code: 'editor',
	description: null,
	removable: true,
	createdAt: null,
	updatedAt: null,
}
const ROLE_NAMES = new Map([
	[1, 'Admin'],
	[2, 'Editor'],
	[3, 'Viewer'],
])

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(
		createMockManagedUser({
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
			roles: [ADMIN],
			...overrides,
		}),
	)
}

function formFrom(overrides: Partial<UserEditFormModel> = {}): UserEditFormModel {
	return {
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
		roleIds: [1],
		status: UserStatus.ACTIVE,
		...overrides,
	}
}

describe('computeUserEditDiff', () => {
	it('should return an empty patch and no changes when nothing changed', () => {
		const result = computeUserEditDiff(buildUser(), formFrom(), ROLE_NAMES)

		expect(result).toEqual({ patch: {}, changes: {} })
	})

	it('should include only the changed profile fields', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ firstName: 'Grace' }), ROLE_NAMES)

		expect(result.patch).toEqual({ firstName: 'Grace' })
		expect(result.changes).toEqual({ firstName: { before: 'Ada', after: 'Grace' } })
	})

	it('should ignore surrounding whitespace in text fields', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ email: '  ada@example.com ' }), ROLE_NAMES)

		expect(result.changes).toEqual({})
	})

	it('should send the trimmed value for a changed text field', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ lastName: ' Hopper ' }), ROLE_NAMES)

		expect(result.patch).toEqual({ lastName: 'Hopper' })
	})

	it('should report added roles as sorted role names', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ roleIds: [2, 1] }), ROLE_NAMES)

		expect(result.patch).toEqual({ roleIds: [2, 1] })
		expect(result.changes).toEqual({ roles: { before: ['Admin'], after: ['Admin', 'Editor'] } })
	})

	it('should report removing every role as an empty after list', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ roleIds: [] }), ROLE_NAMES)

		expect(result.patch).toEqual({ roleIds: [] })
		expect(result.changes).toEqual({ roles: { before: ['Admin'], after: [] } })
	})

	it('should not treat a reordered but identical role set as a change', () => {
		const user = buildUser({ roles: [ADMIN, EDITOR] })

		const result = computeUserEditDiff(user, formFrom({ roleIds: [2, 1] }), ROLE_NAMES)

		expect(result.changes).toEqual({})
	})

	it('should de-duplicate role ids in the patch', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ roleIds: [1, 3, 3] }), ROLE_NAMES)

		expect(result.patch).toEqual({ roleIds: [1, 3] })
	})

	it('should fall back to the role id when a role name is unknown', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ roleIds: [1, 99] }), ROLE_NAMES)

		expect(result.changes).toEqual({ roles: { before: ['Admin'], after: ['99', 'Admin'] } })
	})

	it('should include a changed status', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ status: UserStatus.DISABLED }), ROLE_NAMES)

		expect(result.patch).toEqual({ status: UserStatus.DISABLED })
		expect(result.changes).toEqual({ status: { before: UserStatus.ACTIVE, after: UserStatus.DISABLED } })
	})

	it('should ignore a target status the update endpoint cannot set', () => {
		const result = computeUserEditDiff(buildUser(), formFrom({ status: UserStatus.DELETED }), ROLE_NAMES)

		expect(result).toEqual({ patch: {}, changes: {} })
	})

	it('should combine every changed field in display order', () => {
		const result = computeUserEditDiff(
			buildUser(),
			formFrom({ email: 'grace@example.com', firstName: 'Grace', roleIds: [2], status: UserStatus.DISABLED }),
			ROLE_NAMES,
		)

		expect(result.patch).toEqual({
			firstName: 'Grace',
			email: 'grace@example.com',
			roleIds: [2],
			status: UserStatus.DISABLED,
		})
		expect(Object.keys(result.changes)).toEqual(['firstName', 'email', 'roles', 'status'])
	})
})
