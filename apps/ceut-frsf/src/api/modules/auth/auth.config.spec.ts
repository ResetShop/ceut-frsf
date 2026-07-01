import { describe, expect, it } from 'vitest'
import { parseCronEnv } from '../../config/cron.env'
import { parseSecurityEnv } from '../../config/security.env'
import { parseTokenEnv } from '../../config/token.env'
import {
	DEFAULT_ACCESS_TOKEN_EXPIRY,
	DEFAULT_LOCKOUT_DURATION,
	DEFAULT_MAX_FAILED_ATTEMPTS,
	DEFAULT_REFRESH_TOKEN_EXPIRY,
} from '../../constants/auth.constants'
import { createAuthConfig } from './auth.config'

describe('createAuthConfig', () => {
	// AuthConfig aggregates three sub-schemas (token / security / cron). Build a typed AuthConfig from
	// raw env-style overrides (no process.env mutation), routing each flat override to the schema that
	// owns it. PASETO_SECRET_KEY / PASETO_ISSUER are required by the token schema, so they are always
	// supplied; unknown keys (e.g. CRON_SECRET) route to the cron schema.
	function config(overrides: NodeJS.ProcessEnv = {}) {
		const tokenKeys = new Set([
			'PASETO_SECRET_KEY',
			'PASETO_ISSUER',
			'PASETO_ACCESS_TOKEN_EXPIRY',
			'PASETO_REFRESH_TOKEN_EXPIRY',
			'PASETO_CLOCK_TOLERANCE',
			'COOKIE_SECURE',
		])
		const securityKeys = new Set([
			'AUTH_MAX_FAILED_ATTEMPTS',
			'AUTH_LOCKOUT_DURATION',
			'AUTH_CHANGE_PASSWORD_RATE_LIMIT_WINDOW',
			'AUTH_CHANGE_PASSWORD_RATE_LIMIT_MAX',
		])
		const tokenOverrides: NodeJS.ProcessEnv = {}
		const securityOverrides: NodeJS.ProcessEnv = {}
		const cronOverrides: NodeJS.ProcessEnv = {}
		for (const [key, value] of Object.entries(overrides)) {
			if (tokenKeys.has(key)) tokenOverrides[key] = value
			else if (securityKeys.has(key)) securityOverrides[key] = value
			else cronOverrides[key] = value
		}
		return createAuthConfig(
			parseTokenEnv({
				PASETO_SECRET_KEY: '0123456789abcdef'.repeat(4),
				PASETO_ISSUER: 'test-issuer',
				...tokenOverrides,
			}),
			parseSecurityEnv(securityOverrides),
			parseCronEnv(cronOverrides),
		)
	}

	describe('cookieSecure', () => {
		it('should default to true when COOKIE_SECURE is unset', () => {
			expect(config().cookieSecure).toBe(true)
		})

		it('should return false when COOKIE_SECURE is "false"', () => {
			expect(config({ COOKIE_SECURE: 'false' }).cookieSecure).toBe(false)
		})

		it('should return true when COOKIE_SECURE is "true"', () => {
			expect(config({ COOKIE_SECURE: 'true' }).cookieSecure).toBe(true)
		})
	})

	describe('accessTokenExpiry', () => {
		it('should use DEFAULT_ACCESS_TOKEN_EXPIRY when env var is unset', () => {
			expect(config().accessTokenExpiry).toBe(DEFAULT_ACCESS_TOKEN_EXPIRY)
		})

		it('should use the env var value when set', () => {
			expect(config({ PASETO_ACCESS_TOKEN_EXPIRY: '30m' }).accessTokenExpiry).toBe('30m')
		})
	})

	describe('refreshTokenExpiry', () => {
		it('should use DEFAULT_REFRESH_TOKEN_EXPIRY when env var is unset', () => {
			expect(config().refreshTokenExpiry).toBe(DEFAULT_REFRESH_TOKEN_EXPIRY)
		})

		it('should use the env var value when set', () => {
			expect(config({ PASETO_REFRESH_TOKEN_EXPIRY: '14d' }).refreshTokenExpiry).toBe('14d')
		})
	})

	describe('maxFailedAttempts', () => {
		it('should use DEFAULT_MAX_FAILED_ATTEMPTS when env var is unset', () => {
			expect(config().maxFailedAttempts).toBe(DEFAULT_MAX_FAILED_ATTEMPTS)
		})

		it('should parse a valid positive integer', () => {
			expect(config({ AUTH_MAX_FAILED_ATTEMPTS: '10' }).maxFailedAttempts).toBe(10)
		})

		it('should fall back to default when value is zero', () => {
			expect(config({ AUTH_MAX_FAILED_ATTEMPTS: '0' }).maxFailedAttempts).toBe(DEFAULT_MAX_FAILED_ATTEMPTS)
		})

		it('should fall back to default when value is negative', () => {
			expect(config({ AUTH_MAX_FAILED_ATTEMPTS: '-3' }).maxFailedAttempts).toBe(DEFAULT_MAX_FAILED_ATTEMPTS)
		})

		it('should fall back to default when value is non-numeric', () => {
			expect(config({ AUTH_MAX_FAILED_ATTEMPTS: 'abc' }).maxFailedAttempts).toBe(DEFAULT_MAX_FAILED_ATTEMPTS)
		})
	})

	describe('lockoutDuration', () => {
		it('should use DEFAULT_LOCKOUT_DURATION when env var is unset', () => {
			expect(config().lockoutDuration).toBe(DEFAULT_LOCKOUT_DURATION)
		})

		it('should use a valid duration string', () => {
			expect(config({ AUTH_LOCKOUT_DURATION: '30m' }).lockoutDuration).toBe('30m')
		})

		it('should fall back to default when value is invalid', () => {
			expect(config({ AUTH_LOCKOUT_DURATION: 'not-a-duration' }).lockoutDuration).toBe(DEFAULT_LOCKOUT_DURATION)
		})
	})

	describe('cronSecret', () => {
		it('should be undefined when CRON_SECRET is unset', () => {
			expect(config().cronSecret).toBeUndefined()
		})

		it('should map the CRON_SECRET value when set', () => {
			const secret = 'a'.repeat(32)
			expect(config({ CRON_SECRET: secret }).cronSecret).toBe(secret)
		})
	})

	it('should return a frozen object', () => {
		expect(Object.isFrozen(config())).toBe(true)
	})
})
