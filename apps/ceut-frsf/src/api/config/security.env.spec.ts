import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type SecurityEnv, parseSecurityEnv, resetSecurityEnv, securityEnv, seedSecurityEnv } from './security.env'

describe('parseSecurityEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('AUTH_MAX_FAILED_ATTEMPTS', () => {
		it('defaults to 5', () => {
			expect(parseSecurityEnv({}).AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
		})

		it('coerces a valid positive integer', () => {
			expect(parseSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '10' }).AUTH_MAX_FAILED_ATTEMPTS).toBe(10)
		})

		it('falls back to default on zero or negative', () => {
			expect(parseSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '0' }).AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
			expect(parseSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '-3' }).AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
		})

		it('falls back to default on non-numeric', () => {
			expect(parseSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: 'abc' }).AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
		})
	})

	describe('AUTH_LOCKOUT_DURATION', () => {
		it('defaults to "15m"', () => {
			expect(parseSecurityEnv({}).AUTH_LOCKOUT_DURATION).toBe('15m')
		})

		it('uses a valid duration string', () => {
			expect(parseSecurityEnv({ AUTH_LOCKOUT_DURATION: '30m' }).AUTH_LOCKOUT_DURATION).toBe('30m')
		})

		it('falls back to default on invalid duration string', () => {
			expect(parseSecurityEnv({ AUTH_LOCKOUT_DURATION: 'not-a-duration' }).AUTH_LOCKOUT_DURATION).toBe('15m')
		})
	})

	describe('AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW', () => {
		it('defaults to "15m"', () => {
			expect(parseSecurityEnv({}).AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW).toBe('15m')
		})

		it('uses a valid duration string', () => {
			expect(
				parseSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW: '30m' }).AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW,
			).toBe('30m')
		})

		it('falls back to default on invalid duration string', () => {
			expect(
				parseSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW: 'not-a-duration' })
					.AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW,
			).toBe('15m')
		})
	})

	describe('AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX', () => {
		it('defaults to 5', () => {
			expect(parseSecurityEnv({}).AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(5)
		})

		it('coerces a valid positive integer', () => {
			expect(parseSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX: '10' }).AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(
				10,
			)
		})

		it('falls back to default on invalid values (tolerant)', () => {
			expect(parseSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX: 'abc' }).AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(
				5,
			)
			expect(parseSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX: '0' }).AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(5)
		})
	})

	describe('decoupling from the token schema', () => {
		// security config carries no required field, so it parses cleanly with no
		// PASETO keys present — the SSR prerender worker and the seed script can
		// read securityEnv without the env handler FATAL-exiting.
		it('parses successfully with no PASETO keys present, yielding all defaults', () => {
			expect(() => parseSecurityEnv({})).not.toThrow()
			const env = parseSecurityEnv({})
			expect(env.AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
			expect(env.AUTH_LOCKOUT_DURATION).toBe('15m')
			expect(env.AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW).toBe('15m')
			expect(env.AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(5)
		})
	})

	describe('SecurityEnv type', () => {
		it('is assignable from a parseSecurityEnv result', () => {
			const result: SecurityEnv = parseSecurityEnv({})
			expect(result.AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
		})
	})
})

describe('seedSecurityEnv / resetSecurityEnv / securityEnv proxy', () => {
	beforeEach(() => {
		clearAllMocks()
		resetSecurityEnv()
	})

	afterEach(() => {
		resetSecurityEnv()
		seedSecurityEnv()
	})

	it('seedSecurityEnv with no args applies the schema defaults', () => {
		seedSecurityEnv()
		expect(securityEnv.AUTH_MAX_FAILED_ATTEMPTS).toBe(5)
		expect(securityEnv.AUTH_LOCKOUT_DURATION).toBe('15m')
	})

	it('seedSecurityEnv applies overrides', () => {
		seedSecurityEnv({ AUTH_LOCKOUT_DURATION: '30m' })
		expect(securityEnv.AUTH_LOCKOUT_DURATION).toBe('30m')
	})

	it('seedSecurityEnv applies a rate-limit override through the proxy', () => {
		seedSecurityEnv({ AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX: '10' })
		expect(securityEnv.AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX).toBe(10)
	})

	it('securityEnv returns the same cached value across repeated property reads', () => {
		seedSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '7' })
		const first = securityEnv.AUTH_MAX_FAILED_ATTEMPTS
		const second = securityEnv.AUTH_MAX_FAILED_ATTEMPTS
		expect(first).toBe(second)
	})

	it('resetSecurityEnv clears the cache so the next seed takes effect', () => {
		seedSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '7' })
		expect(securityEnv.AUTH_MAX_FAILED_ATTEMPTS).toBe(7)

		resetSecurityEnv()
		seedSecurityEnv({ AUTH_MAX_FAILED_ATTEMPTS: '9' })
		expect(securityEnv.AUTH_MAX_FAILED_ATTEMPTS).toBe(9)
	})
})
