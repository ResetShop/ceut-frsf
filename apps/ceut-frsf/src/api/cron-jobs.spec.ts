import { describe, expect, it } from 'vitest'

import { tryParseEnvIntervalMs } from './cron-jobs'

describe('tryParseEnvIntervalMs', () => {
	const minInterval = '1m'
	const maxInterval = '7d'

	it('returns null when the env value is undefined', () => {
		expect(tryParseEnvIntervalMs(undefined, minInterval, maxInterval)).toBeNull()
	})

	it('returns null when the env value is an empty string', () => {
		expect(tryParseEnvIntervalMs('', minInterval, maxInterval)).toBeNull()
	})

	it('returns null when the env value is not a valid duration string', () => {
		expect(tryParseEnvIntervalMs('garbage', minInterval, maxInterval)).toBeNull()
		expect(tryParseEnvIntervalMs('86400000', minInterval, maxInterval)).toBeNull()
		expect(tryParseEnvIntervalMs('24', minInterval, maxInterval)).toBeNull()
	})

	it('returns null when the env value is below the minimum', () => {
		// '30s' = 30_000ms, below '1m' = 60_000ms
		expect(tryParseEnvIntervalMs('30s', minInterval, maxInterval)).toBeNull()
	})

	it('returns null when the env value is above the maximum', () => {
		// '14d' = 1_209_600_000ms, above '7d' = 604_800_000ms
		expect(tryParseEnvIntervalMs('14d', minInterval, maxInterval)).toBeNull()
	})

	it('returns the parsed milliseconds for a valid duration string within bounds', () => {
		// '24h' = 86_400_000ms, within ['1m', '7d']
		expect(tryParseEnvIntervalMs('24h', minInterval, maxInterval)).toBe(86_400_000)
	})

	it('treats the minimum bound as inclusive', () => {
		// '1m' = exactly the minimum
		expect(tryParseEnvIntervalMs('1m', minInterval, maxInterval)).toBe(60_000)
	})

	it('treats the maximum bound as inclusive', () => {
		// '7d' = exactly the maximum
		expect(tryParseEnvIntervalMs('7d', minInterval, maxInterval)).toBe(604_800_000)
	})
})
