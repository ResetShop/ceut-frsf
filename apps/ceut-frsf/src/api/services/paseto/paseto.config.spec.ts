import { clearAllMocks } from '@resetshop/util/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseTokenEnv } from '../../config/token.env'
import { createPasetoConfig } from './paseto.config'

describe('createPasetoConfig', () => {
	const validKey = '0123456789abcdef'.repeat(4) // 32 bytes = 64 hex chars

	beforeEach(() => {
		clearAllMocks()
	})

	it('maps secretKey from PASETO_SECRET_KEY', () => {
		const config = createPasetoConfig(parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer' }))

		expect(config.secretKey).toBe(validKey)
	})

	it('maps issuer from PASETO_ISSUER', () => {
		const config = createPasetoConfig(parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'my-issuer' }))

		expect(config.issuer).toBe('my-issuer')
	})

	it('uses PASETO_ACCESS_TOKEN_EXPIRY from source when present', () => {
		const config = createPasetoConfig(
			parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer', PASETO_ACCESS_TOKEN_EXPIRY: '30m' }),
		)

		expect(config.accessTokenExpiry).toBe('30m')
	})

	it('falls back to the schema default for PASETO_ACCESS_TOKEN_EXPIRY when absent', () => {
		const config = createPasetoConfig(parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer' }))

		expect(config.accessTokenExpiry).toBe('15m')
	})

	it('uses PASETO_REFRESH_TOKEN_EXPIRY from source when present', () => {
		const config = createPasetoConfig(
			parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer', PASETO_REFRESH_TOKEN_EXPIRY: '14d' }),
		)

		expect(config.refreshTokenExpiry).toBe('14d')
	})

	it('maps clockTolerance from PASETO_CLOCK_TOLERANCE', () => {
		const config = createPasetoConfig(
			parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer', PASETO_CLOCK_TOLERANCE: '2m' }),
		)

		expect(config.clockTolerance).toBe('2m')
	})

	it('returns a frozen object', () => {
		const config = createPasetoConfig(parseTokenEnv({ PASETO_SECRET_KEY: validKey, PASETO_ISSUER: 'test-issuer' }))

		expect(Object.isFrozen(config)).toBe(true)
	})
})
