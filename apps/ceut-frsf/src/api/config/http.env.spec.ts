import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type HttpEnv, httpEnv, isServerless, parseHttpEnv, resetHttpEnv, seedHttpEnv } from './http.env'

describe('parseHttpEnv', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	describe('IS_SERVERLESS', () => {
		it('defaults to false', () => {
			expect(parseHttpEnv({}).IS_SERVERLESS).toBe(false)
		})

		it('returns true only for "true"', () => {
			expect(parseHttpEnv({ IS_SERVERLESS: 'true' }).IS_SERVERLESS).toBe(true)
			expect(parseHttpEnv({ IS_SERVERLESS: '1' }).IS_SERVERLESS).toBe(false)
			expect(parseHttpEnv({ IS_SERVERLESS: 'false' }).IS_SERVERLESS).toBe(false)
		})
	})

	describe('PORT', () => {
		it('defaults to 4000', () => {
			expect(parseHttpEnv({}).PORT).toBe(4000)
		})

		it('coerces a valid string to a number', () => {
			expect(parseHttpEnv({ PORT: '3000' }).PORT).toBe(3000)
		})

		it('falls back to default on invalid values (tolerant)', () => {
			expect(parseHttpEnv({ PORT: 'abc' }).PORT).toBe(4000)
		})
	})

	describe('CORS_ORIGIN and CORS_MAX_AGE', () => {
		it('applies defaults', () => {
			const env = parseHttpEnv({})
			expect(env.CORS_ORIGIN).toBe('http://localhost:4200')
			expect(env.CORS_MAX_AGE).toBe(86400)
		})

		it('uses env values when set', () => {
			const env = parseHttpEnv({ CORS_ORIGIN: 'https://example.com', CORS_MAX_AGE: '3600' })
			expect(env.CORS_ORIGIN).toBe('https://example.com')
			expect(env.CORS_MAX_AGE).toBe(3600)
		})

		it('falls back to default on invalid CORS_MAX_AGE (tolerant)', () => {
			expect(parseHttpEnv({ CORS_MAX_AGE: 'abc' }).CORS_MAX_AGE).toBe(86400)
		})
	})

	describe('BASE_HREF', () => {
		it('is undefined by default', () => {
			expect(parseHttpEnv({}).BASE_HREF).toBeUndefined()
		})

		it('passes through when set', () => {
			expect(parseHttpEnv({ BASE_HREF: '/app' }).BASE_HREF).toBe('/app')
		})
	})

	describe('HttpEnv type', () => {
		it('is assignable from a parseHttpEnv result', () => {
			const result: HttpEnv = parseHttpEnv({})
			expect(result.PORT).toBe(4000)
		})
	})
})

describe('seedHttpEnv / resetHttpEnv / httpEnv proxy / isServerless', () => {
	beforeEach(() => {
		resetHttpEnv()
	})

	afterEach(() => {
		resetHttpEnv()
		seedHttpEnv()
	})

	it('seedHttpEnv with no args applies defaults', () => {
		seedHttpEnv()
		expect(httpEnv.PORT).toBe(4000)
		expect(httpEnv.IS_SERVERLESS).toBe(false)
	})

	it('isServerless() returns false by default', () => {
		seedHttpEnv()
		expect(isServerless()).toBe(false)
	})

	it('isServerless() returns true when IS_SERVERLESS is seeded as "true"', () => {
		seedHttpEnv({ IS_SERVERLESS: 'true' })
		expect(isServerless()).toBe(true)
	})

	it('httpEnv returns the same cached value across repeated property reads', () => {
		seedHttpEnv({ PORT: '5555' })
		const first = httpEnv.PORT
		const second = httpEnv.PORT
		expect(first).toBe(second)
	})
})
