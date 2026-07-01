import { createPermission } from '../access/permission.mapper'
import { createRole } from '../access/role.mapper'
import { createUser } from './user.mapper'

describe('User', () => {
	const createTestRoles = () => {
		const adminPermissions = [
			createPermission({
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			}),
			createPermission({
				id: 2,
				name: 'admin:users:write',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'write',
			}),
		]
		const editorPermissions = [
			createPermission({
				id: 3,
				name: 'admin:posts:read',
				description: null,
				module: 'admin',
				resource: 'posts',
				action: 'read',
			}),
			createPermission({
				id: 4,
				name: 'admin:posts:write',
				description: null,
				module: 'admin',
				resource: 'posts',
				action: 'write',
			}),
		]

		return [
			createRole({
				id: 1,
				code: 'admin',
				name: 'Administrator',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: adminPermissions,
			}),
			createRole({
				id: 2,
				code: 'editor',
				name: 'Editor',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: editorPermissions,
			}),
		]
	}

	describe('createUser', () => {
		it('should create a user with all properties', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.id).toBe(1)
			expect(user.email).toBe('john@example.com')
			expect(user.firstName).toBe('John')
			expect(user.lastName).toBe('Doe')
			expect(user.roles).toEqual(roles)
		})

		it('should allow empty roles array', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.roles).toEqual([])
		})
	})

	describe('fullName', () => {
		it('should return firstName and lastName concatenated', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.fullName).toBe('John Doe')
		})

		it('should handle single-word names without trailing space', () => {
			const user = createUser({
				id: 1,
				email: 'prince@example.com',
				firstName: 'Prince',
				lastName: '',
				roles: [],
			})

			expect(user.fullName).toBe('Prince')
		})
	})

	describe('permissions', () => {
		it('should aggregate permissions from all roles', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.permissions).toHaveLength(4)
		})

		it('should deduplicate permissions across roles', () => {
			const sharedPermission = createPermission({
				id: 1,
				name: 'admin:users:read',
				description: null,
				module: 'admin',
				resource: 'users',
				action: 'read',
			})
			const role1 = createRole({
				id: 1,
				code: 'admin',
				name: 'Administrator',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [sharedPermission],
			})
			const role2 = createRole({
				id: 2,
				code: 'viewer',
				name: 'Viewer',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [sharedPermission],
			})

			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [role1, role2],
			})

			expect(user.permissions).toHaveLength(1)
			expect(user.permissions[0].identifier).toBe('admin:users:read')
		})

		it('should return empty array for user with no roles', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.permissions).toEqual([])
		})
	})

	describe('hasPermission', () => {
		it('should return true when user has permission by identifier', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.hasPermission('admin:users:read')).toBe(true)
			expect(user.hasPermission('admin:posts:write')).toBe(true)
		})

		it('should return false when user does not have permission', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.hasPermission('admin:settings:read')).toBe(false)
		})

		it('should return false for user with no roles', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.hasPermission('admin:users:read')).toBe(false)
		})
	})

	describe('hasRole', () => {
		it('should return true when user has role', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.hasRole('admin')).toBe(true)
			expect(user.hasRole('editor')).toBe(true)
		})

		it('should return false when user does not have role', () => {
			const roles = createTestRoles()
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.hasRole('superadmin')).toBe(false)
		})

		it('should return false for user with no roles', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.hasRole('admin')).toBe(false)
		})
	})
})
