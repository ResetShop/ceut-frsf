import type { PermissionData, RoleWithPermissions } from '@contracts/role/role.types'
import { mapPermission, mapRole } from './role.mapper'

describe('Role Mapper', () => {
	describe('mapPermission', () => {
		it('should map PermissionData to IPermission', () => {
			const data: PermissionData = {
				id: 1,
				name: 'admin:users:read',
				description: 'Can read user data',
				module: 'admin',
				resource: 'users',
				action: 'read',
			}

			const permission = mapPermission(data)

			expect(permission.id).toBe(1)
			expect(permission.name).toBe('admin:users:read')
			expect(permission.description).toBe('Can read user data')
			expect(permission.module).toBe('admin')
			expect(permission.resource).toBe('users')
			expect(permission.action).toBe('read')
			expect(permission.identifier).toBe('admin:users:read')
		})

		it('should handle null description', () => {
			const data: PermissionData = {
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			}

			const permission = mapPermission(data)

			expect(permission.description).toBeNull()
		})

		it('should create permission with correct identifier', () => {
			const data: PermissionData = {
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			}

			const permission = mapPermission(data)

			expect(permission.identifier).toBe('admin:users:read')
		})
	})

	describe('mapRole', () => {
		it('should map RoleWithPermissions to IRole', () => {
			const data: RoleWithPermissions = {
				id: 1,
				code: 'admin',
				name: 'Administrator',
				description: 'Full access',
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [
					{ id: 1, name: 'admin:users:read', description: null, module: 'admin', resource: 'users', action: 'read' },
					{ id: 2, name: 'admin:users:write', description: null, module: 'admin', resource: 'users', action: 'write' },
				],
			}

			const role = mapRole(data)

			expect(role.id).toBe(1)
			expect(role.code).toBe('admin')
			expect(role.name).toBe('Administrator')
			expect(role.description).toBe('Full access')
			expect(role.permissions).toHaveLength(2)
		})

		it('should handle null description', () => {
			const data: RoleWithPermissions = {
				id: 1,
				code: 'guest',
				name: 'Guest',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [],
			}

			const role = mapRole(data)

			expect(role.description).toBeNull()
		})

		it('should handle empty permissions', () => {
			const data: RoleWithPermissions = {
				id: 1,
				code: 'guest',
				name: 'Guest',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [],
			}

			const role = mapRole(data)

			expect(role.permissions).toEqual([])
		})

		it('should create role with working permission methods', () => {
			const data: RoleWithPermissions = {
				id: 1,
				code: 'admin',
				name: 'Administrator',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [
					{ id: 1, name: 'admin:users:read', description: null, module: 'admin', resource: 'users', action: 'read' },
				],
			}

			const role = mapRole(data)

			expect(role.hasPermission('admin:users:read')).toBe(true)
			expect(role.hasPermission('admin:users:write')).toBe(false)
		})
	})
})
