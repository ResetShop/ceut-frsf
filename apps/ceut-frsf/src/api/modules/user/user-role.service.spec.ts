import { UserStatus } from '@contracts/user/user.constants'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PaginatedResponse } from '../../interfaces'
import type { PermissionData, RoleData, RoleRepository, RoleWithPermissions } from '../access/role/interfaces'
import type { UserData, UserRepository, UserRoleRepository } from './interfaces'
import { USER_ROLE_ERRORS } from './user-role.errors'
import { UserRoleService } from './user-role.service'

describe('UserRoleService', () => {
	// Mock functions
	const mockFindRolesForUser = fn<
		[number, { offset?: number; limit?: number }?],
		Promise<PaginatedResponse<RoleData>>
	>()
	const mockFindPermissionsForUser = fn<[number], Promise<PermissionData[]>>()
	const mockAssignRoleToUser = fn<[number, number, number], Promise<boolean>>()
	const mockRemoveRoleFromUser = fn<[number, number, number], Promise<boolean>>()
	const mockFindUserHasRole = fn<[number, number], Promise<boolean>>()
	const mockFindRolesWithPermissionsForUser = fn<[number], Promise<RoleWithPermissions[]>>()
	const mockReplaceUserRoles = fn<[number, number[], number], Promise<void>>()
	const mockFindUserById = fn<[number], Promise<UserData | null>>()
	const mockFindRoleById = fn<[number], Promise<RoleData | null>>()

	const mockUserRoleRepository: UserRoleRepository = {
		findRolesForUser: mockFindRolesForUser,
		findPermissionsForUser: mockFindPermissionsForUser,
		assignRoleToUser: mockAssignRoleToUser,
		removeRoleFromUser: mockRemoveRoleFromUser,
		findUserHasRole: mockFindUserHasRole,
		findRolesWithPermissionsForUser: mockFindRolesWithPermissionsForUser,
		replaceUserRoles: mockReplaceUserRoles,
	}

	const mockUserRepository: UserRepository = {
		findById: mockFindUserById,
		findByEmail: fn(),
	}

	const mockRoleRepository: RoleRepository = {
		findById: mockFindRoleById,
		findByName: fn(),
		findByCode: fn(),
		findAll: fn(),
		create: fn(),
		update: fn(),
		delete: fn(),
		findPermissionsForRole: fn(),
		findPermissionsByIds: fn(),
		assignPermissions: fn(),
		removeAllPermissions: fn(),
	}

	let service: UserRoleService

	const testUser: UserData = {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		status: UserStatus.ACTIVE,
	}

	const testRole: RoleData = {
		id: 1,
		name: 'Admin',
		code: 'admin',
		description: 'Administrator',
		removable: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const testPermissions: PermissionData[] = [
		{
			id: 1,
			name: 'can_create_users',
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
		{
			id: 2,
			name: 'can_delete_users',
			description: 'Delete users',
			module: 'admin',
			resource: 'users',
			action: 'delete',
		},
	]

	beforeEach(() => {
		clearAllMocks()

		service = new UserRoleService({
			userRoleRepository: mockUserRoleRepository,
			userRepository: mockUserRepository,
			roleRepository: mockRoleRepository,
		})
	})

	describe('getUserRoles', () => {
		it('should return user roles with pagination', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 0,
				limit: 10,
			}
			mockFindUserById.mockResolvedValue(testUser)
			mockFindRolesForUser.mockResolvedValue(paginatedResponse)

			const result = await service.getUserRoles(1)

			expect(result).toEqual(paginatedResponse)
			expect(mockFindUserById.calls).toEqual([[1]])
			expect(mockFindRolesForUser.calls).toEqual([[1, undefined]])
		})

		it('should pass pagination parameters', async () => {
			const paginatedResponse: PaginatedResponse<RoleData> = {
				data: [testRole],
				total: 1,
				offset: 5,
				limit: 5,
			}
			mockFindUserById.mockResolvedValue(testUser)
			mockFindRolesForUser.mockResolvedValue(paginatedResponse)

			const result = await service.getUserRoles(1, { offset: 5, limit: 5 })

			expect(result.offset).toBe(5)
			expect(result.limit).toBe(5)
			expect(mockFindRolesForUser.calls).toEqual([[1, { offset: 5, limit: 5 }]])
		})

		it('should throw USER_NOT_FOUND when user does not exist', async () => {
			mockFindUserById.mockResolvedValue(null)

			await expect(service.getUserRoles(999)).rejects.toThrow(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})
	})

	describe('getUserPermissions', () => {
		it('should return user permissions', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockFindPermissionsForUser.mockResolvedValue(testPermissions)

			const result = await service.getUserPermissions(1)

			expect(result).toEqual(testPermissions)
			expect(mockFindUserById.calls).toEqual([[1]])
			expect(mockFindPermissionsForUser.calls).toEqual([[1]])
		})

		it('should throw USER_NOT_FOUND when user does not exist', async () => {
			mockFindUserById.mockResolvedValue(null)

			await expect(service.getUserPermissions(999)).rejects.toThrow(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})
	})

	describe('assignRoleToUser', () => {
		it('should assign role to user', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockFindRoleById.mockResolvedValue(testRole)
			mockAssignRoleToUser.mockResolvedValue(true)

			await service.assignRoleToUser(1, 1, 999)

			expect(mockFindUserById.calls).toEqual([[1]])
			expect(mockFindRoleById.calls).toEqual([[1]])
			expect(mockAssignRoleToUser.calls).toEqual([[1, 1, 999]])
		})

		it('should throw USER_NOT_FOUND when user does not exist', async () => {
			mockFindUserById.mockResolvedValue(null)

			await expect(service.assignRoleToUser(999, 1, 999)).rejects.toThrow(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should throw ROLE_NOT_FOUND when role does not exist', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockFindRoleById.mockResolvedValue(null)

			await expect(service.assignRoleToUser(1, 999, 999)).rejects.toThrow(USER_ROLE_ERRORS.ROLE_NOT_FOUND)
		})

		it('should throw ROLE_ALREADY_ASSIGNED when role is already assigned', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockFindRoleById.mockResolvedValue(testRole)
			mockAssignRoleToUser.mockResolvedValue(false)

			await expect(service.assignRoleToUser(1, 1, 999)).rejects.toThrow(USER_ROLE_ERRORS.ROLE_ALREADY_ASSIGNED)
		})
	})

	describe('removeRoleFromUser', () => {
		it('should remove role from user', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockRemoveRoleFromUser.mockResolvedValue(true)

			await service.removeRoleFromUser(1, 1, 999)

			expect(mockFindUserById.calls).toEqual([[1]])
			expect(mockRemoveRoleFromUser.calls).toEqual([[1, 1, 999]])
		})

		it('should throw USER_NOT_FOUND when user does not exist', async () => {
			mockFindUserById.mockResolvedValue(null)

			await expect(service.removeRoleFromUser(999, 1, 999)).rejects.toThrow(USER_ROLE_ERRORS.USER_NOT_FOUND)
		})

		it('should throw ROLE_NOT_ASSIGNED when role is not assigned', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockRemoveRoleFromUser.mockResolvedValue(false)

			await expect(service.removeRoleFromUser(1, 999, 999)).rejects.toThrow(USER_ROLE_ERRORS.ROLE_NOT_ASSIGNED)
		})
	})

	describe('replaceUserRoles', () => {
		it('should replace user roles', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockReplaceUserRoles.mockResolvedValue(undefined)

			await service.replaceUserRoles(1, [1, 2, 3], 999)

			expect(mockFindUserById.calls).toEqual([[1]])
			expect(mockReplaceUserRoles.calls).toEqual([[1, [1, 2, 3], 999]])
		})

		it('should handle empty roleIds array', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockReplaceUserRoles.mockResolvedValue(undefined)

			await service.replaceUserRoles(1, [], 999)

			expect(mockReplaceUserRoles.calls).toEqual([[1, [], 999]])
		})

		it('should throw USER_NOT_FOUND when user does not exist', async () => {
			mockFindUserById.mockResolvedValue(null)

			await expect(service.replaceUserRoles(999, [1, 2], 999)).rejects.toThrow(USER_ROLE_ERRORS.USER_NOT_FOUND)
			expect(mockReplaceUserRoles.calls).toEqual([])
		})

		it('should propagate "Roles not found" error from repository', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockReplaceUserRoles.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 99, 100`))

			await expect(service.replaceUserRoles(1, [99, 100], 999)).rejects.toThrow(
				`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: 99, 100`,
			)
		})

		it('should propagate "Non-removable roles" error from repository', async () => {
			mockFindUserById.mockResolvedValue(testUser)
			mockReplaceUserRoles.mockRejectedValue(new Error(`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: 1`))

			await expect(service.replaceUserRoles(1, [2, 3], 999)).rejects.toThrow(
				`${USER_ROLE_ERRORS.NON_REMOVABLE_ROLES}: 1`,
			)
		})
	})
})
