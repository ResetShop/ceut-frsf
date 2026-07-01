/**
 * E2E test database connection. Unlike the integration harness (random free port), the e2e embedded
 * Postgres uses a FIXED port so its connection string is known at playwright.config eval time — the
 * config passes it to the dev server via `webServer.env`, overriding any ambient `PG_CONNECTION_STRING`
 * (e.g. a developer's dev DB). Without that, the server would query the wrong database and logins fail.
 *
 * In CI, `PG_TEST_CONNECTION_STRING` points at the postgres:17 service and the embedded path is skipped.
 */
// Fixed (not random) so the connection string is known at playwright.config eval time. Uncommon port to
// avoid clashing with a local dev Postgres (5432); change it if it conflicts with something on your machine.
const PORT = 54329
const USER = 'postgres'
const PASSWORD = 'postgres'
const DB_NAME = 'test_db'

let pg: import('embedded-postgres').default | undefined

export function e2eConnectionString(): string {
	return process.env['PG_TEST_CONNECTION_STRING'] || `postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`
}

export async function startE2ePostgres(): Promise<void> {
	const { mkdtempSync } = await import('node:fs')
	const { tmpdir } = await import('node:os')
	const { join } = await import('node:path')
	const { default: EmbeddedPostgres } = await import('embedded-postgres')

	pg = new EmbeddedPostgres({
		databaseDir: mkdtempSync(join(tmpdir(), 'rs-e2e-pg-')),
		port: PORT,
		user: USER,
		password: PASSWORD,
		persistent: false,
		onLog: () => undefined,
		onError: (err) => console.error('[e2e-pg]', err),
	})

	await pg.initialise()
	await pg.start()
	await pg.createDatabase(DB_NAME)
}

export async function stopE2ePostgres(): Promise<void> {
	if (!pg) return
	await pg.stop()
	pg = undefined
}
