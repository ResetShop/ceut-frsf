/**
 * Password-hashing env sub-schema.
 *
 * Contains only `BCRYPT_COST` — the bcrypt work factor used by
 * `createPasswordHasher()`. Kept separate from the token config so that contexts
 * needing only hashing config (e.g. the database seed script) can import
 * `passwordEnv` without triggering PASETO key validation, which would otherwise
 * `process.exit(1)` whenever `PASETO_SECRET_KEY` / `PASETO_ISSUER` are unset.
 *
 * Consumers must import `passwordEnv` (or `parsePasswordEnv` / `seedPasswordEnv`
 * for tests). Direct `process.env[...]` access is ESLint-forbidden everywhere
 * except files matching `*.env.ts`.
 */
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DEFAULT_BCRYPT_COST = 12

const PasswordEnvSchema = z.object({
	BCRYPT_COST: z.coerce.number().int().positive().default(DEFAULT_BCRYPT_COST).catch(DEFAULT_BCRYPT_COST),
})

export type PasswordEnv = z.infer<typeof PasswordEnvSchema>

// Empty — BCRYPT_COST is optional with a safe default, so `parsePasswordEnv({})`
// succeeds. Kept for structural symmetry with the other sub-schemas.
const handler = createEnvHandler('password', PasswordEnvSchema, {})

export const parsePasswordEnv = handler.parse
export const passwordEnv = handler.proxy
export const seedPasswordEnv = handler.seed
export const resetPasswordEnv = handler.reset
