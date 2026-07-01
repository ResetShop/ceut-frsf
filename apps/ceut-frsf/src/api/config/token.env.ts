/**
 * Token / session env sub-schema.
 *
 * Covers PASETO secrets, token expiries, the clock tolerance, and the cookie
 * security flag — everything needed to issue and validate authentication tokens
 * and to set the auth cookies. `PASETO_SECRET_KEY` and `PASETO_ISSUER` are the
 * only required-without-default fields in the whole env contract, so isolating
 * them here means contexts that need only hashing, lockout, or cron config (e.g.
 * the seed script, the SSR prerender worker) never trigger PASETO validation.
 *
 * Consumers must import `tokenEnv` (or `parseTokenEnv` / `seedTokenEnv` for tests).
 * Direct `process.env[...]` access is ESLint-forbidden everywhere except files
 * matching `*.env.ts`.
 */
import { z } from 'zod'
import { DEFAULT_ACCESS_TOKEN_EXPIRY, DEFAULT_REFRESH_TOKEN_EXPIRY } from '../constants/auth.constants'
import { createEnvHandler } from './env-utils'

const DEFAULT_CLOCK_TOLERANCE = '1m'

const TokenEnvSchema = z.object({
	PASETO_SECRET_KEY: z
		.string()
		.regex(
			/^[0-9a-fA-F]{64,}$/,
			'PASETO_SECRET_KEY must be at least 32 bytes (64 hex characters). Generate with: openssl rand -hex 32',
		),
	PASETO_ISSUER: z.string().min(1),
	PASETO_ACCESS_TOKEN_EXPIRY: z.string().min(1).default(DEFAULT_ACCESS_TOKEN_EXPIRY),
	PASETO_REFRESH_TOKEN_EXPIRY: z.string().min(1).default(DEFAULT_REFRESH_TOKEN_EXPIRY),
	PASETO_CLOCK_TOLERANCE: z.string().min(1).default(DEFAULT_CLOCK_TOLERANCE),
	COOKIE_SECURE: z
		.string()
		.optional()
		.transform((v) => v !== 'false'),
})

export type TokenEnv = z.infer<typeof TokenEnvSchema>

const handler = createEnvHandler('token', TokenEnvSchema, {
	PASETO_SECRET_KEY: '0123456789abcdef'.repeat(4), // 32 bytes = 64 hex chars
	PASETO_ISSUER: 'test-issuer',
})

export const parseTokenEnv = handler.parse
export const tokenEnv = handler.proxy
export const seedTokenEnv = handler.seed
export const resetTokenEnv = handler.reset
