import type { LoginResponse, MeResponse } from '@contracts/auth/auth.types'
import { mapLoginResponseToUser, mapMeResponseToUser } from './auth.mapper'

describe('Auth Mapper', () => {
	describe('mapLoginResponseToUser', () => {
		it('should map LoginResponse to IUser preserving roles + permissions', () => {
			const response: LoginResponse = {
				user: {
					id: 1,
					email: 'john@example.com',
					firstName: 'John',
					lastName: 'Doe',
					roles: [
						{
							id: 10,
							code: 'admin',
							name: 'Administrator',
							description: 'Full access',
							removable: true,
							createdAt: new Date('2026-01-01T00:00:00.000Z'),
							updatedAt: new Date('2026-01-01T00:00:00.000Z'),
							permissions: [
								{
									id: 100,
									name: 'Read users',
									description: 'View users',
									module: 'admin',
									resource: 'users',
									action: 'read',
								},
							],
						},
					],
				},
				mustChangePassword: false,
			}

			const user = mapLoginResponseToUser(response)

			expect(user.id).toBe(1)
			expect(user.email).toBe('john@example.com')
			expect(user.firstName).toBe('John')
			expect(user.lastName).toBe('Doe')
			expect(user.roles).toHaveLength(1)
			expect(user.roles[0].code).toBe('admin')
			expect(user.permissions).toHaveLength(1)
			expect(user.hasPermission('admin:users:read')).toBe(true)
		})

		it('should map LoginResponse with no roles to a user with empty permissions', () => {
			const response: LoginResponse = {
				user: {
					id: 1,
					email: 'john@example.com',
					firstName: 'John',
					lastName: 'Doe',
					roles: [],
				},
				mustChangePassword: false,
			}

			const user = mapLoginResponseToUser(response)

			expect(user.roles).toEqual([])
			expect(user.permissions).toEqual([])
		})
	})

	describe('mapMeResponseToUser', () => {
		it('should map MeResponse to IUser with roles', () => {
			const response: MeResponse = {
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [
					{
						id: 1,
						code: 'admin',
						name: 'Administrator',
						description: null,
						removable: true,
						permissions: [
							{ id: 1, name: 'Read Users', description: null, module: 'admin', resource: 'users', action: 'read' },
						],
					},
				],
				mustChangePassword: false,
			}

			const user = mapMeResponseToUser(response)

			expect(user.id).toBe(1)
			expect(user.email).toBe('john@example.com')
			expect(user.firstName).toBe('John')
			expect(user.lastName).toBe('Doe')
			expect(user.roles).toHaveLength(1)
			expect(user.roles[0].code).toBe('admin')
			expect(user.hasPermission('admin:users:read')).toBe(true)
		})

		it('should handle empty roles', () => {
			const response: MeResponse = {
				id: 1,
				email: 'john@example.com',
				firstName: 'John',
				lastName: 'Doe',
				roles: [],
				mustChangePassword: false,
			}

			const user = mapMeResponseToUser(response)

			expect(user.roles).toEqual([])
		})
	})
})
