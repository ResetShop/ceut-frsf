import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type AppEnv, appEnv, parseAppEnv, resetAppEnv, seedAppEnv } from './app.env'

describe('parseAppEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('NODE_ENV', () => {
		it('defaults to "development" when unset', () => {
			expect(parseAppEnv({}).NODE_ENV).toBe('development')
		})

		it('accepts "test" and "production"', () => {
			expect(parseAppEnv({ NODE_ENV: 'test' }).NODE_ENV).toBe('test')
			expect(parseAppEnv({ NODE_ENV: 'production' }).NODE_ENV).toBe('production')
		})

		it('rejects unknown values', () => {
			expect(() => parseAppEnv({ NODE_ENV: 'staging' })).toThrow()
		})
	})

	describe('APP_LANGUAGE', () => {
		it('defaults to "en"', () => {
			expect(parseAppEnv({}).APP_LANGUAGE).toBe('en')
		})

		it('passes through when set', () => {
			expect(parseAppEnv({ APP_LANGUAGE: 'es' }).APP_LANGUAGE).toBe('es')
		})
	})

	describe('INTEGRATION_TEST_ADMIN_PASSWORD', () => {
		it('is undefined when unset', () => {
			expect(parseAppEnv({}).INTEGRATION_TEST_ADMIN_PASSWORD).toBeUndefined()
		})

		it('passes through when set', () => {
			expect(parseAppEnv({ INTEGRATION_TEST_ADMIN_PASSWORD: 'secret' }).INTEGRATION_TEST_ADMIN_PASSWORD).toBe('secret')
		})
	})

	describe('SEED_ADMIN_*', () => {
		it('SEED_ADMIN_EMAIL is undefined when unset', () => {
			expect(parseAppEnv({}).SEED_ADMIN_EMAIL).toBeUndefined()
		})

		it('SEED_ADMIN_EMAIL passes through when set', () => {
			expect(parseAppEnv({ SEED_ADMIN_EMAIL: 'admin@example.com' }).SEED_ADMIN_EMAIL).toBe('admin@example.com')
		})

		it('SEED_ADMIN_PASSWORD is undefined when unset', () => {
			expect(parseAppEnv({}).SEED_ADMIN_PASSWORD).toBeUndefined()
		})

		it('SEED_ADMIN_PASSWORD passes through when set', () => {
			expect(parseAppEnv({ SEED_ADMIN_PASSWORD: 'MySecretPass123' }).SEED_ADMIN_PASSWORD).toBe('MySecretPass123')
		})

		it('SEED_ADMIN_FIRST_NAME is undefined when unset', () => {
			expect(parseAppEnv({}).SEED_ADMIN_FIRST_NAME).toBeUndefined()
		})

		it('SEED_ADMIN_LAST_NAME is undefined when unset', () => {
			expect(parseAppEnv({}).SEED_ADMIN_LAST_NAME).toBeUndefined()
		})
	})

	describe('AppEnv type', () => {
		it('is assignable from a parseAppEnv result', () => {
			const result: AppEnv = parseAppEnv({})
			expect(result.NODE_ENV).toBe('development')
		})
	})
})

describe('seedAppEnv / resetAppEnv / appEnv proxy', () => {
	beforeEach(() => {
		resetAppEnv()
	})

	afterEach(() => {
		resetAppEnv()
		seedAppEnv()
	})

	it('seedAppEnv with no args applies defaults', () => {
		seedAppEnv()
		expect(appEnv.NODE_ENV).toBe('development')
		expect(appEnv.APP_LANGUAGE).toBe('en')
	})

	it('seedAppEnv applies overrides on top of defaults', () => {
		seedAppEnv({ APP_LANGUAGE: 'es' })
		expect(appEnv.APP_LANGUAGE).toBe('es')
	})

	it('resetAppEnv clears the cache so the next seed takes effect', () => {
		seedAppEnv({ APP_LANGUAGE: 'es' })
		expect(appEnv.APP_LANGUAGE).toBe('es')

		resetAppEnv()
		seedAppEnv({ APP_LANGUAGE: 'fr' })
		expect(appEnv.APP_LANGUAGE).toBe('fr')
	})
})
