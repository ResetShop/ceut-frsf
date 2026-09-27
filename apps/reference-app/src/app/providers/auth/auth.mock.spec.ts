import type { MeResponse } from '@contracts/auth/auth.types'
import type { AuthUser } from '@contracts/user/user.types'
import { InMemoryAuthApi } from './auth.mock'

describe('InMemoryAuthApi.updateProfile', () => {
	const session: MeResponse = {
		id: 1,
		email: 'ada@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		roles: [],
		mustChangePassword: false,
	}

	let api: InMemoryAuthApi

	beforeEach(() => {
		api = new InMemoryAuthApi()
	})

	it.each([
		['first name', { firstName: 'Grace' }, { firstName: 'Grace', lastName: 'Lovelace' }],
		['last name', { lastName: 'Hopper' }, { firstName: 'Ada', lastName: 'Hopper' }],
		['both names', { firstName: 'Grace', lastName: 'Hopper' }, { firstName: 'Grace', lastName: 'Hopper' }],
	])('merges a %s patch into the session user, keeping every other field', (_, patch, names) => {
		api.setAuthenticatedUser(session)
		let updated: AuthUser | undefined
		let me: MeResponse | undefined

		api.updateProfile(patch).subscribe((user) => (updated = user))
		api.getMe().subscribe((user) => (me = user))

		expect(updated).toEqual({ id: 1, email: 'ada@example.com', roles: [], ...names })
		expect(me).toEqual({ ...session, ...names })
	})

	it('returns the user without session-only fields', () => {
		api.setAuthenticatedUser(session)
		let updated: AuthUser | undefined

		api.updateProfile({ firstName: 'Grace' }).subscribe((user) => (updated = user))

		expect(updated).not.toHaveProperty('mustChangePassword')
	})

	it('errors when there is no session, naming the call and how to set one up', () => {
		let failure: Error | undefined

		api.updateProfile({ firstName: 'Grace' }).subscribe({ error: (error: Error) => (failure = error) })

		expect(failure?.message).toContain('InMemoryAuthApi.updateProfile')
		expect(failure?.message).toContain('setAuthenticatedUser()')
	})

	it('surfaces a configured error', () => {
		api.setAuthenticatedUser(session)
		api.setError('updateProfile', new Error('Boom'))
		let failure: Error | undefined

		api.updateProfile({ firstName: 'Grace' }).subscribe({ error: (error: Error) => (failure = error) })

		expect(failure?.message).toBe('Boom')
	})
})
