import { UserStatus } from '@contracts/user/user.constants'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import type { RoleWithPermissions } from '../access/role/interfaces'
import type { UserData, UserManagementRepository, UserRoleService } from './interfaces'
import { USER_MANAGEMENT_ERRORS } from './user-management.service'
import { UserProfileService } from './user-profile.service'

describe('UserProfileService', () => {
	const mockUpdate = fn<Parameters<UserManagementRepository['update']>, Promise<UserData | null>>()
	const mockGetUserRolesWithPermissions = fn<[number], Promise<RoleWithPermissions[]>>()

	const roles: RoleWithPermissions[] = [
		{
			id: 3,
			code: 'editor',
			name: 'Editor',
			description: null,
			removable: true,
			createdAt: null,
			updatedAt: null,
			permissions: [],
		},
	]

	let service: UserProfileService

	beforeEach(() => {
		clearAllMocks()
		mockGetUserRolesWithPermissions.mockResolvedValue(roles)
		service = new UserProfileService({
			userManagementRepository: { update: mockUpdate } as unknown as UserManagementRepository,
			userRoleService: {
				getUserRolesWithPermissions: mockGetUserRolesWithPermissions,
			} as unknown as UserRoleService,
		})
	})

	it('updates the caller as both target and actor', async () => {
		mockUpdate.mockResolvedValue({
			id: 7,
			email: 'ada@example.com',
			firstName: 'Grace',
			lastName: 'Lovelace',
			status: UserStatus.ACTIVE,
		})

		await service.updateOwnProfile(7, { firstName: 'Grace' })

		expect(mockUpdate.calls).toEqual([[7, { firstName: 'Grace' }, 7]])
	})

	it('returns the updated identity with the caller’s roles and permissions', async () => {
		mockUpdate.mockResolvedValue({
			id: 7,
			email: 'ada@example.com',
			firstName: 'Grace',
			lastName: 'Hopper',
			status: UserStatus.ACTIVE,
		})

		const result = await service.updateOwnProfile(7, { firstName: 'Grace', lastName: 'Hopper' })

		expect(result).toEqual({ id: 7, email: 'ada@example.com', firstName: 'Grace', lastName: 'Hopper', roles })
		expect(mockGetUserRolesWithPermissions.calls).toEqual([[7]])
	})

	it('throws NOT_FOUND when the account no longer exists', async () => {
		mockUpdate.mockResolvedValue(null)

		await expect(service.updateOwnProfile(7, { firstName: 'Grace' })).rejects.toThrow(USER_MANAGEMENT_ERRORS.NOT_FOUND)
		expect(mockGetUserRolesWithPermissions.calls).toHaveLength(0)
	})
})
