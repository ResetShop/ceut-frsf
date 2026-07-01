import { Permission } from '../access/permission.model'
import { Role } from '../access/role.model'
import { createUser } from './user.mapper'

describe('User Mapper', () => {
	describe('createUser', () => {
		it('should create a User instance with all properties', () => {
			const roles = [new Role(1, 'admin', 'Administrator', null, true, null, null, [])]
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

		it('should create user with working fullName getter', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.fullName).toBe('John Doe')
		})

		it('should create user with aggregated permissions', () => {
			const permissions = [new Permission(1, 'admin:users:read', null, 'admin', 'users', 'read')]
			const roles = [new Role(1, 'admin', 'Administrator', null, true, null, null, permissions)]
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.permissions).toHaveLength(1)
			expect(user.hasPermission('admin:users:read')).toBe(true)
		})

		it('should create user with working hasRole method', () => {
			const roles = [new Role(1, 'admin', 'Administrator', null, true, null, null, [])]
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles,
			})

			expect(user.hasRole('admin')).toBe(true)
			expect(user.hasRole('guest')).toBe(false)
		})

		it('should handle empty roles', () => {
			const user = createUser({
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
			})

			expect(user.roles).toEqual([])
			expect(user.permissions).toEqual([])
		})
	})
})
