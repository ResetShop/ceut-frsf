/**
 * Application env sub-schema.
 *
 * Covers cross-cutting application config: the runtime environment selector,
 * the default UI/email language, the integration-test admin password, and the
 * admin credentials consumed by the database seed script (`SEED_ADMIN_*`). The
 * seed fields are raw optional strings — their cross-field requirement (email +
 * password together) and validation live in `seed-admin-credentials.ts`, where
 * clearer error messages can be emitted at resolution time.
 *
 * Consumers must import `appEnv` (or `parseAppEnv` / `seedAppEnv` for tests).
 * Direct `process.env[...]` access is ESLint-forbidden everywhere except files
 * matching `*.env.ts`.
 */
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const DEFAULT_APP_LANGUAGE = 'en'

const AppEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	APP_LANGUAGE: z.string().default(DEFAULT_APP_LANGUAGE),
	INTEGRATION_TEST_ADMIN_PASSWORD: z.string().optional(),
	SEED_ADMIN_EMAIL: z.string().optional(),
	SEED_ADMIN_PASSWORD: z.string().optional(),
	SEED_ADMIN_FIRST_NAME: z.string().optional(),
	SEED_ADMIN_LAST_NAME: z.string().optional(),
})

export type AppEnv = z.infer<typeof AppEnvSchema>

// Empty — every field has a schema-level default or is optional. Kept for
// structural symmetry with other sub-schemas.
const handler = createEnvHandler('app', AppEnvSchema, {})

export const parseAppEnv = handler.parse
export const appEnv = handler.proxy
export const seedAppEnv = handler.seed
export const resetAppEnv = handler.reset
