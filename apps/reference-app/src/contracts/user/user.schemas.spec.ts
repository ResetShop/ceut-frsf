import { updateProfileRequestSchema } from './user.schemas'

describe('updateProfileRequestSchema', () => {
	it('accepts a first-name-only update', () => {
		expect(updateProfileRequestSchema.safeParse({ firstName: 'Ada' }).success).toBe(true)
	})

	it('accepts a last-name-only update', () => {
		expect(updateProfileRequestSchema.safeParse({ lastName: 'Lovelace' }).success).toBe(true)
	})

	it('accepts both names together', () => {
		expect(updateProfileRequestSchema.safeParse({ firstName: 'Ada', lastName: 'Lovelace' }).success).toBe(true)
	})

	it('rejects an email change', () => {
		expect(updateProfileRequestSchema.safeParse({ firstName: 'Ada', email: 'ada@example.com' }).success).toBe(false)
	})

	it.each([
		['roleIds', [1]],
		['status', 'disabled'],
		['id', 2],
	])('rejects the admin-only field %s', (field, value) => {
		expect(updateProfileRequestSchema.safeParse({ firstName: 'Ada', [field]: value }).success).toBe(false)
	})

	it('rejects an empty body', () => {
		expect(updateProfileRequestSchema.safeParse({}).success).toBe(false)
	})

	it('rejects an empty name', () => {
		expect(updateProfileRequestSchema.safeParse({ firstName: '' }).success).toBe(false)
	})
})
