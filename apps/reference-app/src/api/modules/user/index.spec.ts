import { UserStatus } from '@contracts/user/user.constants'
import type { AuthUser } from '@contracts/user/user.types'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { Hono } from 'hono'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import { setAuthenticatedUser } from '../../middlewares/verify-access-token.middleware.mock'
import type { PermissionData } from '../access/role/interfaces'
import userModule from './index'
import type { UpdateOwnProfileParams, UserData } from './interfaces'

describe('user module routing', () => {
	const CALLER_ID = 42

	const mockUpdateOwnProfile = fn<[number, UpdateOwnProfileParams], Promise<AuthUser>>()
	const mockGetUserPermissions = fn<[number], Promise<PermissionData[]>>()
	const mockGetSessionUser = fn<[number], Promise<UserData>>()

	let app: Hono

	beforeEach(() => {
		clearAllMocks()
		mockGetSessionUser.mockResolvedValue({
			id: CALLER_ID,
			email: 'member@example.com',
			firstName: 'Member',
			lastName: 'User',
			status: UserStatus.ACTIVE,
		})
		mockUpdateOwnProfile.mockResolvedValue({
			id: CALLER_ID,
			email: 'member@example.com',
			firstName: 'Renamed',
			lastName: 'User',
			roles: [],
		})
		// A caller with no admin:users:* grant: the admin `PATCH /{id}` route would answer 403.
		mockGetUserPermissions.mockResolvedValue([])

		container.use(
			new InMemoryContainer({
				authService: { getSessionUser: mockGetSessionUser },
				userProfileService: { updateOwnProfile: mockUpdateOwnProfile },
				userRoleService: { getUserPermissions: mockGetUserPermissions },
			}),
		)

		app = new Hono()
		app.use('*', async (c, next) => {
			setAuthenticatedUser(c, {
				sub: String(CALLER_ID),
				email: 'member@example.com',
				firstName: 'Member',
				lastName: 'User',
			})
			await next()
		})
		app.route('/users', userModule)
	})

	afterEach(() => {
		container.restore()
	})

	it('routes PATCH /me to the self-service profile endpoint, not the admin /{id} route', async () => {
		const res = await app.request('/users/me', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ firstName: 'Renamed' }),
		})

		expect(res.status).toBe(200)
		expect(mockUpdateOwnProfile.calls).toEqual([[CALLER_ID, { firstName: 'Renamed' }]])
	})
})
