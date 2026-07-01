/**
 * Playwright globalTeardown — stops the embedded Postgres cluster if globalSetup started one.
 * Runs in the same process as globalSetup, so the embedded-postgres module singleton is shared.
 */
import { stopE2ePostgres } from './test-db'

export default async function globalTeardown(): Promise<void> {
	if (process.env['E2E_USED_EMBEDDED_PG']) {
		await stopE2ePostgres()
	}
}
