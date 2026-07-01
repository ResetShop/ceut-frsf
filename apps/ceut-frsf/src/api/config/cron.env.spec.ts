import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type CronEnv, cronEnv, parseCronEnv, resetCronEnv, seedCronEnv } from './cron.env'

describe('parseCronEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('optional pass-through fields', () => {
		it('all three are undefined when unset', () => {
			const env = parseCronEnv({})
			expect(env.TOKEN_CLEANUP_INTERVAL).toBeUndefined()
			expect(env.TOKEN_CLEANUP_BATCH_SIZE).toBeUndefined()
			expect(env.TOKEN_CLEANUP_MAX_BATCH_COUNT).toBeUndefined()
		})

		it('pass through raw string values when set', () => {
			const env = parseCronEnv({
				TOKEN_CLEANUP_INTERVAL: '6h',
				TOKEN_CLEANUP_BATCH_SIZE: '500',
				TOKEN_CLEANUP_MAX_BATCH_COUNT: '50',
			})
			expect(env.TOKEN_CLEANUP_INTERVAL).toBe('6h')
			expect(env.TOKEN_CLEANUP_BATCH_SIZE).toBe('500')
			expect(env.TOKEN_CLEANUP_MAX_BATCH_COUNT).toBe('50')
		})
	})

	describe('CRON_SECRET', () => {
		it('is undefined when unset', () => {
			expect(parseCronEnv({}).CRON_SECRET).toBeUndefined()
		})

		it('passes through when set', () => {
			expect(parseCronEnv({ CRON_SECRET: 'a'.repeat(32) }).CRON_SECRET).toBe('a'.repeat(32))
		})
	})

	describe('CronEnv type', () => {
		it('is assignable from a parseCronEnv result', () => {
			const result: CronEnv = parseCronEnv({})
			expect(result).toBeDefined()
		})
	})
})

describe('seedCronEnv / resetCronEnv / cronEnv proxy', () => {
	beforeEach(() => {
		resetCronEnv()
	})

	afterEach(() => {
		resetCronEnv()
		seedCronEnv()
	})

	it('seedCronEnv with no args leaves all fields undefined', () => {
		seedCronEnv()
		expect(cronEnv.TOKEN_CLEANUP_INTERVAL).toBeUndefined()
	})

	it('seedCronEnv applies overrides', () => {
		seedCronEnv({ TOKEN_CLEANUP_INTERVAL: '12h' })
		expect(cronEnv.TOKEN_CLEANUP_INTERVAL).toBe('12h')
	})

	it('resetCronEnv clears the cache so the next seed takes effect', () => {
		seedCronEnv({ TOKEN_CLEANUP_BATCH_SIZE: '200' })
		expect(cronEnv.TOKEN_CLEANUP_BATCH_SIZE).toBe('200')

		resetCronEnv()
		seedCronEnv({ TOKEN_CLEANUP_BATCH_SIZE: '800' })
		expect(cronEnv.TOKEN_CLEANUP_BATCH_SIZE).toBe('800')
	})
})
