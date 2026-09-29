import { AuthError, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import type { AuthUser } from '@contracts/user/user.types'
import { logger } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn, spyOn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import { setAuthenticatedUser } from '../../middlewares/verify-access-token.middleware.mock'
import type { UpdateOwnProfileParams, UserData } from './interfaces'
import { USER_MANAGEMENT_ERRORS } from './user-management.service'
import userProfileController from './user-profile.controller'

describe('User Profile Controller', () => {
	const CALLER_ID = 42

	const mockGetSessionUser = fn<[number], Promise<UserData>>()
	const mockUpdateOwnProfile = fn<[number, UpdateOwnProfileParams], Promise<AuthUser>>()

	const sessionUser: UserData = {
		id: CALLER_ID,
		email: 'ada@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		status: UserStatus.ACTIVE,
	}

	let app: Hono
	let loggerSecuritySpy: MockFn

	function patchMe(body: unknown) {
		return app.request('/users/me', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	}

	beforeEach(() => {
		clearAllMocks()
		loggerSecuritySpy = spyOn(logger, 'security')
		mockGetSessionUser.mockResolvedValue(sessionUser)
		mockUpdateOwnProfile.mockResolvedValue({ ...sessionUser, firstName: 'Grace', roles: [] })

		container.use(
			new InMemoryContainer({
				authService: { getSessionUser: mockGetSessionUser },
				userProfileService: { updateOwnProfile: mockUpdateOwnProfile },
			}),
		)

		app = new Hono()
		app.use('*', async (c, next) => {
			setAuthenticatedUser(c, {
				sub: String(CALLER_ID),
				email: 'ada@example.com',
				firstName: 'Ada',
				lastName: 'Lovelace',
			})
			await next()
		})
		app.route('/users', userProfileController)
	})

	afterEach(() => {
		container.restore()
	})

	it('updates the caller’s own profile and returns the updated user', async () => {
		const res = await patchMe({ firstName: 'Grace' })

		expect(res.status).toBe(200)
		expect((await res.json()).firstName).toBe('Grace')
		expect(mockUpdateOwnProfile.calls).toEqual([[CALLER_ID, { firstName: 'Grace' }]])
	})

	it('audits the change', async () => {
		await patchMe({ firstName: 'Grace' })

		expect(loggerSecuritySpy.calls[0]).toEqual([
			'profile_updated',
			{ userId: CALLER_ID, changes: { firstName: 'Grace' } },
		])
	})

	it.each([InternalAuthErrorCode.USER_NOT_FOUND, InternalAuthErrorCode.ACCOUNT_DISABLED])(
		'returns the same generic 401 and updates nothing when the session is rejected with %s',
		async (internalCode) => {
			mockGetSessionUser.mockRejectedValue(new AuthError(internalCode))

			const res = await patchMe({ firstName: 'Grace' })

			expect(res.status).toBe(401)
			expect(await res.json()).toEqual({ error: 'Unauthorized' })
			expect(mockUpdateOwnProfile.calls).toHaveLength(0)
		},
	)

	it('returns 401 when the account disappears during the update', async () => {
		mockUpdateOwnProfile.mockRejectedValue(new Error(USER_MANAGEMENT_ERRORS.NOT_FOUND))

		const res = await patchMe({ firstName: 'Grace' })

		expect(res.status).toBe(401)
	})

	it('rejects an email change with 400 without touching the service', async () => {
		const res = await patchMe({ firstName: 'Grace', email: 'grace@example.com' })

		expect(res.status).toBe(400)
		expect(mockUpdateOwnProfile.calls).toHaveLength(0)
	})

	it('rejects an empty body with 400', async () => {
		const res = await patchMe({})

		expect(res.status).toBe(400)
		expect(mockUpdateOwnProfile.calls).toHaveLength(0)
	})
})
