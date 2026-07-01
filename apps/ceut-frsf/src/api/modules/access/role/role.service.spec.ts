import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UserRoleRepository } from '../../user/interfaces'
import type { PermissionData, RoleData } from './interfaces'
import { InMemoryRoleRepository } from './role.repository.mock'
import { InvalidPermissionIdsError, ROLE_ERRORS, RoleService } from './role.service'

describe('RoleService', () => {
	let roleService: RoleService
	let mockRoleRepo: InMemoryRoleRepository

	// Test data
	const testRole: RoleData = {
		id: 1,
		name: 'Administrator',
		code: 'admin',
		description: 'System administrator',
		removable: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	const removableRole: RoleData = {
		id: 2,
		name: 'Editor',
		code: 'editor',
		description: 'Content editor',
		removable: true,
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
		mockRoleRepo = new InMemoryRoleRepository()
		const mockUserRoleRepository: UserRoleRepository = {
			findRolesForUser: fn(),
			findRolesWithPermissionsForUser: fn(),
			findPermissionsForUser: fn(),
			assignRoleToUser: fn(),
			removeRoleFromUser: fn(),
			findUserHasRole: fn(),
			replaceUserRoles: fn(),
		}
		roleService = new RoleService({ roleRepository: mockRoleRepo, userRoleRepository: mockUserRoleRepository })
	})

	afterEach(() => {
		mockRoleRepo.clear()
	})

	describe('getRole', () => {
		it('should return role when found', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.getRole(testRole.id)

			expect(result).toEqual(testRole)
		})

		it('should return null when role not found', async () => {
			const result = await roleService.getRole(999)

			expect(result).toBeNull()
		})
	})

	describe('getRoleByCode', () => {
		it('should return role when found by code', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.getRoleByCode(testRole.code)

			expect(result).toEqual(testRole)
		})

		it('should return null when role not found by code', async () => {
			const result = await roleService.getRoleByCode('nonexistent')

			expect(result).toBeNull()
		})
	})

	describe('getAllRoles', () => {
		it('should return paginated roles', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles()

			expect(result.data).toHaveLength(2)
			expect(result.total).toBe(2)
			expect(result.offset).toBe(0)
			expect(result.limit).toBe(10)
		})

		it('should respect pagination parameters', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ offset: 1, limit: 1 })

			expect(result.data).toHaveLength(1)
			expect(result.total).toBe(2)
			expect(result.offset).toBe(1)
			expect(result.limit).toBe(1)
		})

		it('should return empty data when offset exceeds total', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.getAllRoles({ offset: 10, limit: 10 })

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(1)
		})

		it('should filter roles by name when search is provided', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: 'admin' })

			expect(result.data).toHaveLength(1)
			expect(result.data[0].name).toBe('Administrator')
			expect(result.total).toBe(1)
		})

		it('should filter roles by code when search is provided', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: 'editor' })

			expect(result.data).toHaveLength(1)
			expect(result.data[0].code).toBe('editor')
			expect(result.total).toBe(1)
		})

		it('should filter roles by description when search is provided', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: 'Content' })

			expect(result.data).toHaveLength(1)
			expect(result.data[0].description).toBe('Content editor')
			expect(result.total).toBe(1)
		})

		it('should perform case-insensitive search', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: 'ADMIN' })

			expect(result.data).toHaveLength(1)
			expect(result.data[0].name).toBe('Administrator')
		})

		it('should return all roles when search is empty string', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: '' })

			expect(result.data).toHaveLength(2)
			expect(result.total).toBe(2)
		})

		it('should return no roles when search matches nothing', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: 'nonexistent' })

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(0)
		})

		it('should ignore leading and trailing whitespace in search', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.getAllRoles({ search: '  admin  ' })

			expect(result.data).toHaveLength(1)
			expect(result.data[0].name).toBe('Administrator')
		})

		it('should combine search with pagination', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)
			mockRoleRepo.addRole({
				id: 3,
				name: 'Admin Viewer',
				code: 'admin_viewer',
				description: 'Can view admin pages',
				removable: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const result = await roleService.getAllRoles({ search: 'admin', offset: 0, limit: 1 })

			expect(result.data).toHaveLength(1)
			expect(result.total).toBe(2)
		})
	})

	describe('createRole', () => {
		it('should create a new role', async () => {
			const params = {
				name: 'New Role',
				code: 'new_role',
				description: 'A new role',
			}

			const result = await roleService.createRole(params, 999)

			expect(result.name).toBe(params.name)
			expect(result.code).toBe(params.code)
			expect(result.description).toBe(params.description)
			expect(result.removable).toBe(true)
		})

		it('should throw CODE_EXISTS when code already exists', async () => {
			mockRoleRepo.addRole(testRole)

			await expect(
				roleService.createRole(
					{
						name: 'Another Admin',
						code: testRole.code,
					},
					999,
				),
			).rejects.toThrow(new RegExp(ROLE_ERRORS.CODE_EXISTS))
		})

		it('should throw NAME_EXISTS when name already exists', async () => {
			mockRoleRepo.addRole(testRole)

			await expect(
				roleService.createRole(
					{
						name: testRole.name,
						code: 'different_code',
					},
					999,
				),
			).rejects.toThrow(new RegExp(ROLE_ERRORS.NAME_EXISTS))
		})

		it('should create role without description', async () => {
			const params = {
				name: 'Minimal Role',
				code: 'minimal_role',
			}

			const result = await roleService.createRole(params, 999)

			expect(result.name).toBe(params.name)
			expect(result.description).toBeNull()
		})
	})

	describe('updateRole', () => {
		it('should update role description', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.updateRole(
				testRole.id,
				{
					description: 'Updated description',
				},
				999,
			)

			expect(result.description).toBe('Updated description')
		})

		it('should update role name', async () => {
			mockRoleRepo.addRole(removableRole)

			const result = await roleService.updateRole(
				removableRole.id,
				{
					name: 'Updated Name',
				},
				999,
			)

			expect(result.name).toBe('Updated Name')
		})

		it('should throw NOT_FOUND when role does not exist', async () => {
			await expect(
				roleService.updateRole(
					999,
					{
						description: 'New description',
					},
					999,
				),
			).rejects.toThrow(new RegExp(ROLE_ERRORS.NOT_FOUND))
		})

		it('should throw NAME_EXISTS when updating to existing name', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addRole(removableRole)

			await expect(
				roleService.updateRole(
					removableRole.id,
					{
						name: testRole.name,
					},
					999,
				),
			).rejects.toThrow(new RegExp(ROLE_ERRORS.NAME_EXISTS))
		})

		it('should allow updating to same name (no change)', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.updateRole(
				testRole.id,
				{
					name: testRole.name,
					description: 'New description',
				},
				999,
			)

			expect(result.name).toBe(testRole.name)
			expect(result.description).toBe('New description')
		})
	})

	describe('deleteRole', () => {
		it('should delete removable role', async () => {
			mockRoleRepo.addRole(removableRole)

			await roleService.deleteRole(removableRole.id, 999)

			const result = await roleService.getRole(removableRole.id)
			expect(result).toBeNull()
		})

		it('should throw NOT_FOUND when role does not exist', async () => {
			await expect(roleService.deleteRole(999, 999)).rejects.toThrow(new RegExp(ROLE_ERRORS.NOT_FOUND))
		})

		it('should throw NOT_REMOVABLE when role is not removable', async () => {
			mockRoleRepo.addRole(testRole) // testRole has removable: false

			await expect(roleService.deleteRole(testRole.id, 999)).rejects.toThrow(new RegExp(ROLE_ERRORS.NOT_REMOVABLE))
		})
	})

	describe('getRolePermissions', () => {
		it('should return paginated permissions for role', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addPermissionsForRole(testRole.id, testPermissions)

			const result = await roleService.getRolePermissions(testRole.id)

			expect(result.data).toHaveLength(2)
			expect(result.total).toBe(2)
			expect(result.data[0].name).toBe('can_create_users')
		})

		it('should throw NOT_FOUND when role does not exist', async () => {
			await expect(roleService.getRolePermissions(999)).rejects.toThrow(new RegExp(ROLE_ERRORS.NOT_FOUND))
		})

		it('should return empty permissions when role has none', async () => {
			mockRoleRepo.addRole(testRole)

			const result = await roleService.getRolePermissions(testRole.id)

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(0)
		})

		it('should respect pagination parameters', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addPermissionsForRole(testRole.id, testPermissions)

			const result = await roleService.getRolePermissions(testRole.id, { offset: 1, limit: 1 })

			expect(result.data).toHaveLength(1)
			expect(result.total).toBe(2)
			expect(result.offset).toBe(1)
			expect(result.limit).toBe(1)
		})
	})

	describe('assignPermissionsToRole', () => {
		const availablePermissions: PermissionData[] = [
			{ id: 1, name: 'perm_1', description: 'Permission 1', module: 'admin', resource: 'resource', action: 'action' },
			{ id: 2, name: 'perm_2', description: 'Permission 2', module: 'admin', resource: 'resource', action: 'action' },
			{ id: 3, name: 'perm_3', description: 'Permission 3', module: 'admin', resource: 'resource', action: 'action' },
			{ id: 5, name: 'perm_5', description: 'Permission 5', module: 'admin', resource: 'resource', action: 'action' },
		]

		beforeEach(() => {
			// Add available permissions to the mock repository
			availablePermissions.forEach((p) => mockRoleRepo.addAvailablePermission(p))
		})

		it('should assign permissions to role', async () => {
			mockRoleRepo.addRole(testRole)

			await roleService.assignPermissionsToRole(testRole.id, [1, 2, 3], 999)

			const result = await roleService.getRolePermissions(testRole.id)
			expect(result.data).toHaveLength(3)
		})

		it('should throw NOT_FOUND when role does not exist', async () => {
			await expect(roleService.assignPermissionsToRole(999, [1, 2], 999)).rejects.toThrow(
				new RegExp(ROLE_ERRORS.NOT_FOUND),
			)
		})

		it('should replace existing permissions', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addPermissionsForRole(testRole.id, testPermissions)

			await roleService.assignPermissionsToRole(testRole.id, [5], 999)

			const result = await roleService.getRolePermissions(testRole.id)
			expect(result.data).toHaveLength(1)
			expect(result.data[0].id).toBe(5)
		})

		it('should throw InvalidPermissionIdsError when permission IDs do not exist', async () => {
			mockRoleRepo.addRole(testRole)

			await expect(roleService.assignPermissionsToRole(testRole.id, [1, 999, 1000], 999)).rejects.toThrow(
				InvalidPermissionIdsError,
			)
		})

		it('should include invalid IDs in the error', async () => {
			mockRoleRepo.addRole(testRole)

			const error = await roleService.assignPermissionsToRole(testRole.id, [1, 999, 1000], 999).catch((e: unknown) => e)

			expect(error).toBeInstanceOf(InvalidPermissionIdsError)
			const invalidError = error as InvalidPermissionIdsError
			expect(invalidError.invalidIds).toEqual([999, 1000])
			expect(invalidError.message).toBe(ROLE_ERRORS.INVALID_PERMISSION_IDS)
		})

		it('should allow assigning empty permissions array', async () => {
			mockRoleRepo.addRole(testRole)
			mockRoleRepo.addPermissionsForRole(testRole.id, testPermissions)

			await roleService.assignPermissionsToRole(testRole.id, [], 999)

			const result = await roleService.getRolePermissions(testRole.id)
			expect(result.data).toHaveLength(0)
		})
	})
})
