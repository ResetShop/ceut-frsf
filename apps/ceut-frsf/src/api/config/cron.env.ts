/**
 * Cron / token-maintenance env sub-schema.
 *
 * The three `TOKEN_CLEANUP_*` fields are raw `z.string().optional()` — clamping,
 * default fallback, and warning logs live at the call sites
 * (`refresh-token.repository.ts` and `cron-jobs.ts`) because the bounds (e.g.
 * `1m`–`7d` for the interval, 100–10000 for the batch size) are business-logic
 * concerns, not schema validation. `CRON_SECRET` (the bearer secret authorizing
 * the `/api/cron/*` endpoints) is likewise validated at its call sites
 * (`cron-jobs.ts`, `auth.config.ts`).
 *
 * Consumers must import `cronEnv` (or `parseCronEnv` / `seedCronEnv` for tests).
 * Direct `process.env[...]` access is ESLint-forbidden everywhere except files
 * matching `*.env.ts`.
 */
import { z } from 'zod'
import { createEnvHandler } from './env-utils'

const CronEnvSchema = z.object({
	TOKEN_CLEANUP_INTERVAL: z.string().optional(),
	TOKEN_CLEANUP_BATCH_SIZE: z.string().optional(),
	TOKEN_CLEANUP_MAX_BATCH_COUNT: z.string().optional(),
	CRON_SECRET: z.string().optional(),
})

export type CronEnv = z.infer<typeof CronEnvSchema>

// Empty — all three fields are optional, so `parseCronEnv({})` succeeds with
// everything undefined. Kept for structural symmetry with other sub-schemas.
const handler = createEnvHandler('cron', CronEnvSchema, {})

export const parseCronEnv = handler.parse
export const cronEnv = handler.proxy
export const seedCronEnv = handler.seed
export const resetCronEnv = handler.reset
