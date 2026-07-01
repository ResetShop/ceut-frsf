/**
 * Vitest globalSetup — runs once before all test files in a separate process.
 * Drops all tables, pushes the DB schema, and seeds base data.
 * On teardown, truncates all tables.
 *
 * Seeding and truncation are delegated to db-helpers.ts to avoid duplicating
 * insert logic. Dynamic imports are used because this file runs in a separate
 * process where env vars must be configured before any module reads them.
 */
import { startEmbeddedPostgres, stopEmbeddedPostgres } from './embedded-pg-test-db'
import { configureEnvVars, getTestConnectionString, loadEnvFile } from './env-helpers'

let usedEmbeddedPg = false

async function pushSchemaToTestDb(connectionString: string): Promise<void> {
	console.log('[Integration] Pushing schema to test database...')
	const { pushSchema } = await import('drizzle-kit/api')
	const { drizzle } = await import('drizzle-orm/node-postgres')
	const { sql } = await import('drizzle-orm')

	const allSchemaImports: Record<string, unknown> = {
		...(await import('../../../db/schema/user')),
		...(await import('../../../db/schema/role')),
		...(await import('../../../db/schema/permission')),
		...(await import('../../../db/schema/authentication')),
		...(await import('../../../db/schema/refresh-token')),
		...(await import('../../../db/schema/password-reset-token')),
		...(await import('../../../db/schema/permission-route')),
		...(await import('../../../db/schema/role-history')),
		...(await import('../../../db/schema/role-permission-history')),
		...(await import('../../../db/schema/user-profile-history')),
		...(await import('../../../db/schema/user-role-history')),
		...(await import('../../../db/schema/user-status-history')),
	}

	const db = drizzle(connectionString)

	// Drop all tables first to avoid drizzle-kit introspection issues
	// when diffing schema changes (known issue with pushSchema + parameterized queries)
	await db.execute(sql`
		DO $$ DECLARE
			r RECORD;
		BEGIN
			FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
				EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
			END LOOP;
		END $$;
	`)

	// Also drop custom enum types that drizzle-kit creates
	await db.execute(sql`
		DO $$ DECLARE
			r RECORD;
		BEGIN
			FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
				EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
			END LOOP;
		END $$;
	`)

	const pushResult = await pushSchema(allSchemaImports, db)

	if (pushResult.warnings.length > 0) {
		console.log('[Integration] Schema push warnings:', pushResult.warnings)
	}

	await pushResult.apply()
	await db.$client.end()
	console.log('[Integration] Schema pushed successfully.')
}

export async function setup(): Promise<void> {
	loadEnvFile()

	// No-Docker local path: spawn a real Postgres 17 cluster on a free port
	// when no connection string is provided. CI sets PG_TEST_CONNECTION_STRING
	// to its postgres:17 service container, so this branch is skipped there.
	// This must write to process.env (not seedDbEnv) — Vitest worker child processes
	// inherit it via the OS environment; in-memory seedXEnv() caches do not cross processes.
	if (!process.env['PG_TEST_CONNECTION_STRING']) {
		process.env['PG_TEST_CONNECTION_STRING'] = await startEmbeddedPostgres()
		usedEmbeddedPg = true
	}

	const connectionString = getTestConnectionString()
	configureEnvVars(connectionString)
	await pushSchemaToTestDb(connectionString)

	console.log('[Integration] Seeding base data...')
	const { getTestDb, closeTestDb, seedBaseData } = await import('./db-helpers')
	const db = getTestDb()
	await seedBaseData(db)
	await closeTestDb()
	console.log('[Integration] Base data seeded successfully.')
}

export async function teardown(): Promise<void> {
	try {
		if (process.env['PG_TEST_CONNECTION_STRING']) {
			console.log('[Integration] Cleaning up test database...')
			const { getTestDb, closeTestDb, truncateAllTables } = await import('./db-helpers')
			const db = getTestDb()
			await truncateAllTables(db)
			await closeTestDb()
			console.log('[Integration] Test database cleaned up.')
		}
	} finally {
		// Always stop the embedded cluster if we started it, even if truncation threw —
		// otherwise the Postgres process and its data directory would leak.
		if (usedEmbeddedPg) {
			await stopEmbeddedPostgres()
		}
	}
}
