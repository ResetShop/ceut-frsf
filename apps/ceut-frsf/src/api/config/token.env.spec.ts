import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type TokenEnv, parseTokenEnv, resetTokenEnv, seedTokenEnv, tokenEnv } from './token.env'

function validMinimalEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		PASETO_SECRET_KEY: 'a'.repeat(64),
		PASETO_ISSUER: 'test-issuer',
		...overrides,
	}
}

describe('parseTokenEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('PASETO_SECRET_KEY', () => {
		it('throws when missing', () => {
			const env = validMinimalEnv()
			delete env.PASETO_SECRET_KEY
			expect(() => parseTokenEnv(env)).toThrow()
		})

		it('throws when shorter than 64 hex characters', () => {
			expect(() => parseTokenEnv(validMinimalEnv({ PASETO_SECRET_KEY: 'a'.repeat(63) }))).toThrow(/at least 32 bytes/)
		})

		it('throws when contains non-hex characters', () => {
			expect(() => parseTokenEnv(validMinimalEnv({ PASETO_SECRET_KEY: 'g'.repeat(64) }))).toThrow(/at least 32 bytes/)
		})

		it('accepts a 64-character hex key', () => {
			expect(parseTokenEnv(validMinimalEnv({ PASETO_SECRET_KEY: 'a'.repeat(64) })).PASETO_SECRET_KEY).toBe(
				'a'.repeat(64),
			)
		})

		it('accepts a longer hex key', () => {
			const key = 'f'.repeat(128)
			expect(parseTokenEnv(validMinimalEnv({ PASETO_SECRET_KEY: key })).PASETO_SECRET_KEY).toBe(key)
		})

		it('accepts mixed-case hex', () => {
			const key = 'aAbBcCdDeEfF00112233445566778899aAbBcCdDeEfF00112233445566778899'
			expect(parseTokenEnv(validMinimalEnv({ PASETO_SECRET_KEY: key })).PASETO_SECRET_KEY).toBe(key)
		})
	})

	describe('PASETO_ISSUER', () => {
		it('throws when missing', () => {
			const env = validMinimalEnv()
			delete env.PASETO_ISSUER
			expect(() => parseTokenEnv(env)).toThrow()
		})

		it('throws when empty', () => {
			expect(() => parseTokenEnv(validMinimalEnv({ PASETO_ISSUER: '' }))).toThrow()
		})
	})

	describe('PASETO token expiries and clock tolerance', () => {
		it('applies default 15m / 7d / 1m when unset', () => {
			const env = parseTokenEnv(validMinimalEnv())
			expect(env.PASETO_ACCESS_TOKEN_EXPIRY).toBe('15m')
			expect(env.PASETO_REFRESH_TOKEN_EXPIRY).toBe('7d')
			expect(env.PASETO_CLOCK_TOLERANCE).toBe('1m')
		})

		it('uses the env value when set', () => {
			const env = parseTokenEnv(
				validMinimalEnv({
					PASETO_ACCESS_TOKEN_EXPIRY: '30m',
					PASETO_REFRESH_TOKEN_EXPIRY: '14d',
					PASETO_CLOCK_TOLERANCE: '30s',
				}),
			)
			expect(env.PASETO_ACCESS_TOKEN_EXPIRY).toBe('30m')
			expect(env.PASETO_REFRESH_TOKEN_EXPIRY).toBe('14d')
			expect(env.PASETO_CLOCK_TOLERANCE).toBe('30s')
		})
	})

	describe('COOKIE_SECURE', () => {
		it('defaults to true when unset', () => {
			expect(parseTokenEnv(validMinimalEnv()).COOKIE_SECURE).toBe(true)
		})

		it('returns false only when value is exactly "false"', () => {
			expect(parseTokenEnv(validMinimalEnv({ COOKIE_SECURE: 'false' })).COOKIE_SECURE).toBe(false)
		})

		it('returns true for "true"', () => {
			expect(parseTokenEnv(validMinimalEnv({ COOKIE_SECURE: 'true' })).COOKIE_SECURE).toBe(true)
		})

		it('returns true for any other value', () => {
			expect(parseTokenEnv(validMinimalEnv({ COOKIE_SECURE: 'yes' })).COOKIE_SECURE).toBe(true)
		})
	})

	describe('TokenEnv type', () => {
		it('is assignable from a parseTokenEnv result', () => {
			const result: TokenEnv = parseTokenEnv(validMinimalEnv())
			expect(result.PASETO_SECRET_KEY).toBeDefined()
		})
	})

	describe('required-field ownership (token is the only schema with required fields)', () => {
		// Counterpart to the decoupling guards in password.env.spec.ts and
		// security.env.spec.ts: the PASETO required fields live HERE and nowhere
		// else, so parsing token config with no env throws. That is what keeps the
		// peripheral schemas (password/security/cron) safe to read without PASETO
		// keys set.
		it('throws when parsed with an empty env (PASETO fields are required)', () => {
			expect(() => parseTokenEnv({})).toThrow()
		})
	})
})

describe('seedTokenEnv / resetTokenEnv / tokenEnv proxy', () => {
	beforeEach(() => {
		clearAllMocks()
		resetTokenEnv()
	})

	afterEach(() => {
		resetTokenEnv()
		seedTokenEnv()
	})

	it('seedTokenEnv with no args uses the module-local test defaults', () => {
		seedTokenEnv()
		expect(tokenEnv.PASETO_SECRET_KEY).toBeDefined()
		expect(tokenEnv.PASETO_ISSUER).toBe('test-issuer')
	})

	it('seedTokenEnv applies overrides on top of defaults', () => {
		seedTokenEnv({ COOKIE_SECURE: 'false' })
		expect(tokenEnv.COOKIE_SECURE).toBe(false)
		// Defaults still apply for unspecified fields
		expect(tokenEnv.PASETO_ISSUER).toBe('test-issuer')
	})

	it('seedTokenEnv applies an expiry override through the proxy', () => {
		seedTokenEnv({ PASETO_ACCESS_TOKEN_EXPIRY: '30m' })
		expect(tokenEnv.PASETO_ACCESS_TOKEN_EXPIRY).toBe('30m')
	})

	it('tokenEnv returns the same cached value across repeated property reads', () => {
		seedTokenEnv({ PASETO_ISSUER: 'cache-test' })
		const first = tokenEnv.PASETO_ISSUER
		const second = tokenEnv.PASETO_ISSUER
		expect(first).toBe(second)
	})

	it('resetTokenEnv clears the cache so the next seed takes effect', () => {
		seedTokenEnv({ PASETO_ISSUER: 'first' })
		expect(tokenEnv.PASETO_ISSUER).toBe('first')

		resetTokenEnv()
		seedTokenEnv({ PASETO_ISSUER: 'second' })
		expect(tokenEnv.PASETO_ISSUER).toBe('second')
	})
})
