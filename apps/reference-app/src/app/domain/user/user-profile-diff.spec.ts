import { computeProfileDiff, type ProfileFormModel } from './user-profile-diff'
import { createUser } from './user.mapper'

const user = createUser({ id: 1, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', roles: [] })

function formFrom(overrides: Partial<ProfileFormModel> = {}): ProfileFormModel {
	return { firstName: 'Ada', lastName: 'Lovelace', ...overrides }
}

describe('computeProfileDiff', () => {
	it('returns an empty patch and no changes when nothing changed', () => {
		expect(computeProfileDiff(user, formFrom())).toEqual({ patch: {}, changes: {} })
	})

	it('includes only the changed first name', () => {
		const result = computeProfileDiff(user, formFrom({ firstName: 'Grace' }))

		expect(result.patch).toEqual({ firstName: 'Grace' })
		expect(result.changes).toEqual({ firstName: { before: 'Ada', after: 'Grace' } })
	})

	it('includes only the changed last name', () => {
		const result = computeProfileDiff(user, formFrom({ lastName: 'Hopper' }))

		expect(result.patch).toEqual({ lastName: 'Hopper' })
		expect(result.changes).toEqual({ lastName: { before: 'Lovelace', after: 'Hopper' } })
	})

	it('ignores surrounding whitespace', () => {
		expect(computeProfileDiff(user, formFrom({ firstName: '  Ada ' })).changes).toEqual({})
	})

	it('sends the trimmed value for a changed field', () => {
		expect(computeProfileDiff(user, formFrom({ lastName: ' Hopper ' })).patch).toEqual({ lastName: 'Hopper' })
	})

	it('lists both changes in display order', () => {
		const result = computeProfileDiff(user, formFrom({ lastName: 'Hopper', firstName: 'Grace' }))

		expect(result.patch).toEqual({ firstName: 'Grace', lastName: 'Hopper' })
		expect(Object.keys(result.changes)).toEqual(['firstName', 'lastName'])
	})
})
