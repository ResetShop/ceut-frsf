/**
 * Playwright globalSetup — runs once in the main process before the webServer starts and before any
 * worker is forked (so env mutations here are inherited by both the dev server and the test workers).
 *
 * Spins up the test database (embedded Postgres locally, or the CI postgres service via
 * PG_TEST_CONNECTION_STRING), pushes the Drizzle schema, points the app at it, and seeds the fixture
 * users. Mirrors the integration harness in src/api/integration/setup/, using relative imports only
 * (Playwright does not resolve the project's TS path aliases here).
 */
import type { FullConfig } from '@playwright/test'
import { adminPassword, seedE2eUsers } from './db-seed'
import { configureE2eEnvVars, loadEnvFile } from './env-helpers'
import { e2eConnectionString, startE2ePostgres } from './test-db'

async function pushSchemaToDb(connectionString: string): Promise<void> {
	const { pushSchema } = await import('drizzle-kit/api')
	const { drizzle } = await import('drizzle-orm/node-postgres')
	const { sql } = await import('drizzle-orm')

	const schemaImports: Record<string, unknown> = {
		...(await import('../../src/db/schema/user')),
		...(await import('../../src/db/schema/role')),
		...(await import('../../src/db/schema/permission')),
		...(await import('../../src/db/schema/authentication')),
		...(await import('../../src/db/schema/refresh-token')),
		...(await import('../../src/db/schema/password-reset-token')),
		...(await import('../../src/db/schema/permission-route')),
		...(await import('../../src/db/schema/role-history')),
		...(await import('../../src/db/schema/role-permission-history')),
		...(await import('../../src/db/schema/user-profile-history')),
		...(await import('../../src/db/schema/user-role-history')),
		...(await import('../../src/db/schema/user-status-history')),
	}

	const db = drizzle(connectionString)
	// Drop existing tables/enums first to avoid drizzle-kit introspection issues on re-push.
	await db.execute(sql`
		DO $$ DECLARE r RECORD;
		BEGIN
			FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
				EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
			END LOOP;
		END $$;
	`)
	await db.execute(sql`
		DO $$ DECLARE r RECORD;
		BEGIN
			FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
				EXECUTE 'DROP TYPE IF EXISTS "' || r.typname || '" CASCADE';
			END LOOP;
		END $$;
	`)

	const result = await pushSchema(schemaImports, db)
	await result.apply()
	await db.$client.end()
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
	loadEnvFile()

	if (!process.env['PG_TEST_CONNECTION_STRING']) {
		await startE2ePostgres()
		process.env['E2E_USED_EMBEDDED_PG'] = 'true'
	}

	const connectionString = e2eConnectionString()
	configureE2eEnvVars(connectionString)
	await pushSchemaToDb(connectionString)

	const { viewableUserId, adminUserId } = await seedE2eUsers(connectionString, adminPassword())
	// Published for specs (inherited by worker processes forked after globalSetup) so the user-detail
	// specs can navigate directly to known target users' pages.
	process.env['E2E_VIEWABLE_USER_ID'] = String(viewableUserId)
	process.env['E2E_ADMIN_USER_ID'] = String(adminUserId)
}
