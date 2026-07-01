import { compare, hash } from 'bcryptjs'
import { passwordEnv } from '../../config/password.env'

/**
 * Returns the number of bcrypt salt rounds.
 * Reads BCRYPT_COST via the passwordEnv proxy at call time (not module load time) so the
 * integration test harness can lower the cost to 1 before any hashing occurs.
 * Default: 12 (production). Override: BCRYPT_COST=1 (tests).
 */
function getBcryptSaltRounds(): number {
	return passwordEnv.BCRYPT_COST
}

/**
 * Factory that produces a bcrypt-backed password hasher.
 * The returned function encapsulates the hashing algorithm and cost
 * configuration so consumers (e.g. UserManagementService) stay free of
 * bcrypt details and of the BCRYPT_COST env coupling.
 *
 * The returned closure resolves the salt rounds on every invocation,
 * not at factory-creation time, so the integration harness can set
 * BCRYPT_COST before the first hash runs.
 *
 * Wire into the Awilix container with:
 *   hashPassword: asValue(createPasswordHasher())
 */
export function createPasswordHasher(): (plain: string) => Promise<string> {
	return (plain) => hash(plain, getBcryptSaltRounds())
}

/**
 * Factory that produces a bcrypt-backed password verifier.
 * Returns a function comparing a plaintext candidate against a stored hash.
 * Encapsulates `bcryptjs.compare` so consumers (e.g. AuthPasswordService) never import
 * bcrypt directly — this module is the single boundary for the hashing algorithm.
 *
 * Wire into the Awilix container with:
 *   verifyPassword: asValue(createPasswordVerifier())
 */
export function createPasswordVerifier(): (plain: string, hash: string) => Promise<boolean> {
	return (plain, hashed) => compare(plain, hashed)
}
