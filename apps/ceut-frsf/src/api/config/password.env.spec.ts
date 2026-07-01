import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type PasswordEnv, parsePasswordEnv, passwordEnv, resetPasswordEnv, seedPasswordEnv } from './password.env'

describe('parsePasswordEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('BCRYPT_COST', () => {
		it('defaults to 12 when unset', () => {
			expect(parsePasswordEnv({}).BCRYPT_COST).toBe(12)
		})

		it('coerces a valid string to a number', () => {
			expect(parsePasswordEnv({ BCRYPT_COST: '1' }).BCRYPT_COST).toBe(1)
		})

		it('coerces a higher valid cost', () => {
			expect(parsePasswordEnv({ BCRYPT_COST: '14' }).BCRYPT_COST).toBe(14)
		})

		it('falls back to default on non-numeric input', () => {
			expect(parsePasswordEnv({ BCRYPT_COST: 'abc' }).BCRYPT_COST).toBe(12)
		})

		it('falls back to default on non-positive input', () => {
			expect(parsePasswordEnv({ BCRYPT_COST: '0' }).BCRYPT_COST).toBe(12)
			expect(parsePasswordEnv({ BCRYPT_COST: '-3' }).BCRYPT_COST).toBe(12)
		})
	})

	describe('decoupling from the token schema', () => {
		// Parsing password config must NOT require any PASETO field. A seed-only
		// process with no PASETO keys set must be able to read passwordEnv.BCRYPT_COST
		// without the env handler FATAL-exiting. Parsing with an env that has no
		// PASETO_* keys proves the schema carries no token dependency.
		it('parses successfully with no PASETO keys present', () => {
			expect(() => parsePasswordEnv({})).not.toThrow()
			expect(parsePasswordEnv({ BCRYPT_COST: '4' })).toEqual({ BCRYPT_COST: 4 })
		})
	})

	describe('PasswordEnv type', () => {
		it('is assignable from a parsePasswordEnv result', () => {
			const result: PasswordEnv = parsePasswordEnv({})
			expect(result.BCRYPT_COST).toBe(12)
		})
	})
})

describe('seedPasswordEnv / resetPasswordEnv / passwordEnv proxy', () => {
	beforeEach(() => {
		clearAllMocks()
		resetPasswordEnv()
	})

	afterEach(() => {
		resetPasswordEnv()
		seedPasswordEnv()
	})

	it('seedPasswordEnv with no args applies the schema default (12)', () => {
		seedPasswordEnv()
		expect(passwordEnv.BCRYPT_COST).toBe(12)
	})

	it('seedPasswordEnv applies an override', () => {
		seedPasswordEnv({ BCRYPT_COST: '4' })
		expect(passwordEnv.BCRYPT_COST).toBe(4)
	})

	it('passwordEnv returns the same cached value across repeated property reads', () => {
		seedPasswordEnv({ BCRYPT_COST: '6' })
		const first = passwordEnv.BCRYPT_COST
		const second = passwordEnv.BCRYPT_COST
		expect(first).toBe(second)
	})

	it('resetPasswordEnv clears the cache so the next seed takes effect', () => {
		seedPasswordEnv({ BCRYPT_COST: '4' })
		expect(passwordEnv.BCRYPT_COST).toBe(4)

		resetPasswordEnv()
		seedPasswordEnv({ BCRYPT_COST: '10' })
		expect(passwordEnv.BCRYPT_COST).toBe(10)
	})
})
