import { UserStatus } from '@contracts/user/user.constants'
import { createMockManagedUser } from '@providers/users/users.mock'
import { mapManagedUserResponse } from './managed-user.mapper'

describe('mapManagedUserResponse', () => {
	it('should map all fields from the API response', () => {
		const data = createMockManagedUser()
		const result = mapManagedUserResponse(data)

		expect(result.id).toBe(1)
		expect(result.email).toBe('john@example.com')
		expect(result.firstName).toBe('John')
		expect(result.lastName).toBe('Doe')
		expect(result.status).toBe(UserStatus.ACTIVE)
		expect(result.statusChangedAt).toBeNull()
		expect(result.statusChangedBy).toBeNull()
		expect(result.deletedAt).toBeNull()
		expect(result.createdAt).toEqual(new Date('2025-01-01'))
		expect(result.updatedAt).toEqual(new Date('2025-01-01'))
	})

	it('should compute fullName from firstName and lastName', () => {
		const result = mapManagedUserResponse(createMockManagedUser({ firstName: 'Jane', lastName: 'Smith' }))

		expect(result.fullName).toBe('Jane Smith')
	})

	it('should trim fullName when lastName is empty', () => {
		const result = mapManagedUserResponse(createMockManagedUser({ firstName: 'Prince', lastName: '' }))

		expect(result.fullName).toBe('Prince')
	})

	it('should trim fullName when firstName is empty', () => {
		const result = mapManagedUserResponse(createMockManagedUser({ firstName: '', lastName: 'Doe' }))

		expect(result.fullName).toBe('Doe')
	})

	it('should map roles as shallow copies', () => {
		const roles = [
			{ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null },
			{
				id: 2,
				name: 'Editor',
				code: 'editor',
				description: 'Can edit',
				removable: false,
				createdAt: null,
				updatedAt: null,
			},
		]
		const result = mapManagedUserResponse(createMockManagedUser({ roles }))

		expect(result.roles).toHaveLength(2)
		expect(result.roles[0]).toEqual(roles[0])
		expect(result.roles[1]).toEqual(roles[1])
		expect(result.roles[0]).not.toBe(roles[0])
	})

	it('should handle empty roles array', () => {
		const result = mapManagedUserResponse(createMockManagedUser({ roles: [] }))

		expect(result.roles).toEqual([])
	})
})
