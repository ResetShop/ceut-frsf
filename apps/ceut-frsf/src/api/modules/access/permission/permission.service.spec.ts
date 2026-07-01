import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PermissionData } from '../role/interfaces'
import { InMemoryPermissionRepository } from './permission.repository.mock'
import { PermissionService } from './permission.service'

describe('PermissionService', () => {
	let permissionService: PermissionService
	let mockPermissionRepo: InMemoryPermissionRepository

	const testPermissions: PermissionData[] = [
		{
			id: 1,
			name: 'admin:users:create',
			description: 'Create users',
			module: 'admin',
			resource: 'users',
			action: 'create',
		},
		{ id: 2, name: 'admin:users:read', description: 'View users', module: 'admin', resource: 'users', action: 'read' },
		{
			id: 3,
			name: 'admin:roles:create',
			description: 'Create roles',
			module: 'admin',
			resource: 'roles',
			action: 'create',
		},
		{ id: 4, name: 'admin:roles:read', description: 'View roles', module: 'admin', resource: 'roles', action: 'read' },
	]

	beforeEach(() => {
		mockPermissionRepo = new InMemoryPermissionRepository()
		permissionService = new PermissionService({ permissionRepository: mockPermissionRepo })
	})

	afterEach(() => {
		mockPermissionRepo.clear()
	})

	describe('getAllPermissions', () => {
		it('should return paginated permissions', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions()

			expect(result.data).toHaveLength(4)
			expect(result.total).toBe(4)
			expect(result.offset).toBe(0)
			expect(result.limit).toBe(10)
		})

		it('should respect pagination parameters', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ offset: 1, limit: 2 })

			expect(result.data).toHaveLength(2)
			expect(result.total).toBe(4)
			expect(result.offset).toBe(1)
			expect(result.limit).toBe(2)
		})

		it('should return empty data when offset exceeds total', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ offset: 10, limit: 10 })

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(4)
		})

		it('should return empty data when no permissions exist', async () => {
			const result = await permissionService.getAllPermissions()

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(0)
		})

		it('should filter permissions by name when search is provided', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: 'create' })

			expect(result.data).toHaveLength(2)
			expect(result.data.every((p) => p.name.includes('create') || p.action.includes('create'))).toBe(true)
		})

		it('should filter permissions by resource when search is provided', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: 'roles' })

			expect(result.data).toHaveLength(2)
			expect(result.data.every((p) => p.resource === 'roles')).toBe(true)
		})

		it('should perform case-insensitive search', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: 'USERS' })

			expect(result.data).toHaveLength(2)
			expect(result.data.every((p) => p.resource === 'users')).toBe(true)
		})

		it('should return all permissions when search is empty string', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: '' })

			expect(result.data).toHaveLength(4)
		})

		it('should return no permissions when search matches nothing', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: 'nonexistent' })

			expect(result.data).toHaveLength(0)
			expect(result.total).toBe(0)
		})

		it('should ignore leading and trailing whitespace in search', async () => {
			testPermissions.forEach((p) => mockPermissionRepo.addPermission(p))

			const result = await permissionService.getAllPermissions({ search: '  users  ' })

			expect(result.data).toHaveLength(2)
		})
	})
})
