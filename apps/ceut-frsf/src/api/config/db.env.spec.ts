import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type DbEnv, dbEnv, parseDbEnv, resetDbEnv, seedDbEnv } from './db.env'

describe('parseDbEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('PG_CONNECTION_STRING', () => {
		it('throws when missing', () => {
			expect(() => parseDbEnv({})).toThrow()
		})

		it('throws when empty', () => {
			expect(() => parseDbEnv({ PG_CONNECTION_STRING: '' })).toThrow()
		})

		it('passes through a valid connection string', () => {
			const cs = 'postgresql://user:pass@localhost:5432/db'
			expect(parseDbEnv({ PG_CONNECTION_STRING: cs }).PG_CONNECTION_STRING).toBe(cs)
		})
	})

	describe('PG_TEST_CONNECTION_STRING', () => {
		it('is optional', () => {
			const env = parseDbEnv({ PG_CONNECTION_STRING: 'postgresql://test/test' })
			expect(env.PG_TEST_CONNECTION_STRING).toBeUndefined()
		})

		it('passes through when set', () => {
			const cs = 'postgresql://test:test@localhost:5432/test_db'
			const env = parseDbEnv({
				PG_CONNECTION_STRING: 'postgresql://app/db',
				PG_TEST_CONNECTION_STRING: cs,
			})
			expect(env.PG_TEST_CONNECTION_STRING).toBe(cs)
		})

		it('throws when set to empty string', () => {
			expect(() =>
				parseDbEnv({
					PG_CONNECTION_STRING: 'postgresql://app/db',
					PG_TEST_CONNECTION_STRING: '',
				}),
			).toThrow()
		})
	})

	describe('DbEnv type', () => {
		it('is assignable from a parseDbEnv result', () => {
			const result: DbEnv = parseDbEnv({ PG_CONNECTION_STRING: 'postgresql://test/test' })
			expect(result.PG_CONNECTION_STRING).toBeDefined()
		})
	})
})

describe('seedDbEnv / resetDbEnv / dbEnv proxy', () => {
	beforeEach(() => {
		resetDbEnv()
	})

	afterEach(() => {
		// Restore the handler's test-defaults so other specs in the same worker see them.
		resetDbEnv()
		seedDbEnv()
	})

	it('seedDbEnv with no args uses the module-local test defaults', () => {
		seedDbEnv()
		expect(dbEnv.PG_CONNECTION_STRING).toMatch(/^postgresql:\/\//)
	})

	it('seedDbEnv applies overrides on top of defaults', () => {
		seedDbEnv({ PG_CONNECTION_STRING: 'postgresql://overridden:1234/db' })
		expect(dbEnv.PG_CONNECTION_STRING).toBe('postgresql://overridden:1234/db')
	})

	it('dbEnv returns the same cached value across repeated property reads', () => {
		seedDbEnv({ PG_CONNECTION_STRING: 'postgresql://cache-test/db' })
		const first = dbEnv.PG_CONNECTION_STRING
		const second = dbEnv.PG_CONNECTION_STRING
		expect(first).toBe(second)
	})

	it('resetDbEnv clears the cache so the next seed takes effect', () => {
		seedDbEnv({ PG_CONNECTION_STRING: 'postgresql://first/db' })
		expect(dbEnv.PG_CONNECTION_STRING).toBe('postgresql://first/db')

		resetDbEnv()
		seedDbEnv({ PG_CONNECTION_STRING: 'postgresql://second/db' })
		expect(dbEnv.PG_CONNECTION_STRING).toBe('postgresql://second/db')
	})
})
