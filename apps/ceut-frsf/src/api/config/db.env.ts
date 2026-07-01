/**
 * Database env sub-schema.
 *
 * Covers the Postgres connection strings used by the app (production) and the
 * integration test suite. Self-contained — no dependency on any other env
 * sub-module — so scripts that only need DB config can import it without
 * triggering validation for unrelated domains (PASETO, SMTP, etc.).
 *
 * Consumers must import `dbEnv` (or `parseDbEnv` / `seedDbEnv` for tests).
 * Direct `process.env[...]` access is ESLint-forbidden everywhere except files
 * matching `*.env.ts`.
 */
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DbEnvSchema = z.object({
	PG_CONNECTION_STRING: z.string().min(1),
	PG_TEST_CONNECTION_STRING: z.string().min(1).optional(),
})

export type DbEnv = z.infer<typeof DbEnvSchema>

const handler = createEnvHandler('db', DbEnvSchema, {
	PG_CONNECTION_STRING: 'postgresql://test:test@localhost:5432/test',
})

export const parseDbEnv = handler.parse
export const dbEnv = handler.proxy
export const seedDbEnv = handler.seed
export const resetDbEnv = handler.reset
