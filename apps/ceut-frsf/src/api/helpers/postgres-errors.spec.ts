import { findUniqueViolationConstraint } from './postgres-errors'

describe('findUniqueViolationConstraint', () => {
	it('returns the constraint of a direct unique violation', () => {
		const error = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'card_internal_name_unique' })

		expect(findUniqueViolationConstraint(error)).toBe('card_internal_name_unique')
	})

	it('finds a unique violation wrapped as the cause of another error', () => {
		const driverError = Object.assign(new Error('duplicate key'), {
			code: '23505',
			constraint: 'card_legacy_id_unique',
		})
		const wrapped = new Error('Failed query', { cause: driverError })

		expect(findUniqueViolationConstraint(wrapped)).toBe('card_legacy_id_unique')
	})

	it('returns an empty string when the violation carries no constraint name', () => {
		expect(findUniqueViolationConstraint({ code: '23505' })).toBe('')
	})

	it('returns null for other database errors', () => {
		const error = Object.assign(new Error('fk violation'), { code: '23503', constraint: 'card_history_changed_by_fk' })

		expect(findUniqueViolationConstraint(error)).toBeNull()
	})

	it.each([[null], [undefined], ['boom'], [new Error('plain')]])('returns null for %s', (value) => {
		expect(findUniqueViolationConstraint(value)).toBeNull()
	})

	it('stops walking a cyclic cause chain', () => {
		const error: Error & { cause?: unknown } = new Error('cyclic')
		error.cause = error

		expect(findUniqueViolationConstraint(error)).toBeNull()
	})
})
