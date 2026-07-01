import { createPermission } from './permission.mapper'

describe('Permission', () => {
	describe('createPermission', () => {
		it('should create a permission with all properties', () => {
			const permission = createPermission({
				id: 1,
				name: 'admin:users:read',
				description: 'Can read user data',
				module: 'admin',
				resource: 'users',
				action: 'read',
			})

			expect(permission.id).toBe(1)
			expect(permission.name).toBe('admin:users:read')
			expect(permission.description).toBe('Can read user data')
			expect(permission.module).toBe('admin')
			expect(permission.resource).toBe('users')
			expect(permission.action).toBe('read')
		})

		it('should allow null description', () => {
			const permission = createPermission({
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			})

			expect(permission.description).toBeNull()
		})
	})

	describe('identifier', () => {
		it('should return module:resource:action format', () => {
			const permission = createPermission({
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			})

			expect(permission.identifier).toBe('admin:users:read')
		})

		it('should handle different resource and action combinations', () => {
			const permission1 = createPermission({
				id: 1,
				name: 'admin:roles:create',
				description: null,
				module: 'admin',
				resource: 'roles',
				action: 'create',
			})
			const permission2 = createPermission({
				id: 2,
				name: 'admin:posts:delete',
				description: null,
				module: 'admin',
				resource: 'posts',
				action: 'delete',
			})

			expect(permission1.identifier).toBe('admin:roles:create')
			expect(permission2.identifier).toBe('admin:posts:delete')
		})
	})
})
