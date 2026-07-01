import { clearAllMocks } from '@resetshop/util/test-utils'
import { compare, hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetPasswordEnv, seedPasswordEnv } from '../../config/password.env'
import { createPasswordHasher, createPasswordVerifier } from './password-hasher'

describe('createPasswordHasher', () => {
	beforeEach(() => {
		clearAllMocks()
		// Keep hashing cheap for the common-case tests; the default-cost
		// branch is exercised explicitly by the dedicated test below.
		resetPasswordEnv()
		seedPasswordEnv({ BCRYPT_COST: '1' })
	})

	it('returns a hasher function', () => {
		expect(typeof createPasswordHasher()).toBe('function')
	})

	it('produces a hash that verifies against the original plaintext', async () => {
		const hashPassword = createPasswordHasher()

		const hashed = await hashPassword('correct.horse.battery')

		expect(hashed).not.toBe('correct.horse.battery')
		expect(await compare('correct.horse.battery', hashed)).toBe(true)
	})

	it('produces a distinct salted hash on each call for the same input', async () => {
		const hashPassword = createPasswordHasher()

		const [first, second] = await Promise.all([hashPassword('repeat'), hashPassword('repeat')])

		expect(first).not.toBe(second)
	})

	it('reads BCRYPT_COST at hash time, not at factory-creation time', async () => {
		// Factory is created while the cost is 1...
		const hashPassword = createPasswordHasher()
		// ...but the cost is raised before the hash actually runs.
		seedPasswordEnv({ BCRYPT_COST: '4' })

		const hashed = await hashPassword('late-bound-cost')

		expect(hashed).toMatch(/^\$2[aby]\$04\$/)
	})

	it('defaults to cost 12 when BCRYPT_COST is unset', async () => {
		resetPasswordEnv()
		const hashPassword = createPasswordHasher()

		// Deliberately hashes at the production cost (12) — the bcrypt output
		// prefix is the only way to observe the default. This costs ~300ms and
		// is the sole guard on the production default; every other test in this
		// file runs at cost 1. Keep it: the slowdown is intentional, not a leak.
		const hashed = await hashPassword('default-cost')

		expect(hashed).toMatch(/^\$2[aby]\$12\$/)
	})
})

describe('createPasswordVerifier', () => {
	it('returns a verifier function', () => {
		expect(typeof createPasswordVerifier()).toBe('function')
	})

	it('returns true when the plaintext matches the hash', async () => {
		const hashed = await hash('correct.horse.battery', 1)
		const verify = createPasswordVerifier()

		expect(await verify('correct.horse.battery', hashed)).toBe(true)
	})

	it('returns false when the plaintext does not match the hash', async () => {
		const hashed = await hash('correct.horse.battery', 1)
		const verify = createPasswordVerifier()

		expect(await verify('wrong.password', hashed)).toBe(false)
	})
})
