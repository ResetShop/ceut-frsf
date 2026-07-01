/**
 * Vitest setupFile — runs before each test file (in the test process).
 * Loads .env, sets env vars, and extends Zod with OpenAPI support.
 *
 * Note: DB schema push and seeding happen in global-setup.ts (globalSetup).
 */
import { extendZodWithOpenApi } from '@hono/zod-openapi'
import { afterAll } from 'vitest'
import { z } from 'zod'
import { configureEnvVars, getTestConnectionString, loadEnvFile } from './env-helpers'

// Load .env and configure test-specific env vars.
// These must be set before any test file imports modules that read process.env
// at load time (e.g. password-hasher.ts reads BCRYPT_COST).
loadEnvFile()
configureEnvVars(getTestConnectionString())

// Must run before any Zod schema is imported by test files.
// Safe to call here because setupFiles execute completely before test file imports.
extendZodWithOpenApi(z)

// Close both DB pools after each test file so connections don't leak and the worker
// process can exit cleanly. Under Vitest's default isolation, each test file runs with a
// fresh module graph — its own `container` singleton and its own app pool — so closing the
// app pool here targets that file's pool, never a pool shared with a later file. Leaving it
// open kept its idle TCP sockets alive across the run, which prevented the worker from
// exiting and left an orphaned, memory-retaining node process behind. The test-helper pool
// (`closeTestDb`) is re-created per file via `getTestDb`; the app pool is re-created per file
// on the first handler call.
afterAll(async () => {
	try {
		const { closeTestDb } = await import('./db-helpers')
		await closeTestDb()
	} finally {
		// Run in finally so the app pool is closed even if closeTestDb() throws — otherwise the
		// pool this PR exists to close would leak on a test-helper teardown failure.
		const { container } = await import('../../container/container')
		await container.teardownDb()
	}
})
