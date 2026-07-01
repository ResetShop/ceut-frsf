/**
 * HTTP / hosting env sub-schema.
 *
 * Covers the listening port, CORS configuration, the SSR base path, and the
 * serverless mode flag. Also exports the `isServerless()` helper alongside its
 * source (`IS_SERVERLESS`).
 *
 * Consumers must import `httpEnv` / `isServerless` (or `parseHttpEnv` /
 * `seedHttpEnv` for tests). Direct `process.env[...]` access is ESLint-forbidden
 * everywhere except files matching `*.env.ts`.
 */
import { parseDurationToSeconds } from '@resetshop/util'
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DEFAULT_PORT = 4000
const DEFAULT_CORS_ORIGIN = 'http://localhost:4200'
const DEFAULT_CORS_MAX_AGE = parseDurationToSeconds('24h')

const HttpEnvSchema = z.object({
	BASE_HREF: z.string().optional(),
	IS_SERVERLESS: z
		.string()
		.optional()
		.transform((v) => v === 'true'),
	PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT).catch(DEFAULT_PORT),
	CORS_ORIGIN: z.string().default(DEFAULT_CORS_ORIGIN),
	CORS_MAX_AGE: z.coerce.number().int().positive().default(DEFAULT_CORS_MAX_AGE).catch(DEFAULT_CORS_MAX_AGE),
})

export type HttpEnv = z.infer<typeof HttpEnvSchema>

// Empty — every field has a schema-level default, so `parseHttpEnv({})` succeeds.
// Kept for structural symmetry with other sub-schemas; tests that need
// overrides pass them to `seedHttpEnv()`.
const handler = createEnvHandler('http', HttpEnvSchema, {})

export const parseHttpEnv = handler.parse
export const httpEnv = handler.proxy
export const seedHttpEnv = handler.seed
export const resetHttpEnv = handler.reset

/**
 * True when the app is running in a connection-pooled serverless environment.
 * Reads from the validated `httpEnv` rather than `process.env` directly.
 */
export function isServerless(): boolean {
	return httpEnv.IS_SERVERLESS
}
