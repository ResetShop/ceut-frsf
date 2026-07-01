/**
 * Spawns a real Postgres 17 cluster locally via the `embedded-postgres`
 * package (official EnterpriseDB binaries, downloaded once at install time).
 * Used by `global-setup.ts` to provide a no-Docker test DB when
 * `PG_TEST_CONNECTION_STRING` is not set. Skipped on CI, where the workflow
 * already publishes a connection string pointing at the `postgres:17`
 * service container.
 */
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_DB_NAME = 'test_db'
const PG_USER = 'postgres'
const PG_PASSWORD = 'postgres'
const PG_DIR_PREFIX = 'rs-integration-pg-'

let pg: EmbeddedPostgres | undefined
let databaseDir: string | undefined

async function getFreePort(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const srv = createServer()
		srv.unref()
		srv.on('error', reject)
		srv.listen(0, () => {
			const address = srv.address()
			if (address && typeof address === 'object') {
				const { port } = address
				srv.close(() => resolve(port))
			} else {
				srv.close(() => reject(new Error('Failed to acquire free port')))
			}
		})
	})
}

/**
 * Removes a directory with retries to absorb the Windows file-lock race where a
 * just-killed Postgres child still briefly holds a handle. `force` makes a missing
 * directory a no-op; `maxRetries`/`retryDelay` (Node 14.14+) back off on EBUSY/EPERM.
 */
function removeDirWithRetry(dir: string): void {
	rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
}

/**
 * Best-effort cleanup of leftover embedded-Postgres data directories from interrupted
 * runs (Ctrl-C, OOM, crash) where teardown never fired. A live cluster always writes a
 * `postmaster.pid` file, so its absence marks a directory as safe to delete.
 *
 * Known false-positive: a crash that kills the cluster without removing its `postmaster.pid`
 * (e.g. an OOM kill) leaves the file behind, so that directory is conservatively skipped and
 * lingers until a later run reuses or removes it. Skipping a possibly-live cluster is the safe
 * failure mode — we never delete a data directory that might still be in use. Failures are
 * logged and swallowed — this is opportunistic hygiene, not a correctness requirement.
 */
function sweepStalePgDirs(): void {
	const root = tmpdir()
	let entries: string[]
	try {
		entries = readdirSync(root)
	} catch {
		return
	}
	for (const entry of entries) {
		if (!entry.startsWith(PG_DIR_PREFIX)) continue
		const dir = join(root, entry)
		if (existsSync(join(dir, 'postmaster.pid'))) continue
		try {
			removeDirWithRetry(dir)
		} catch (err) {
			console.error('[embedded-pg] failed to sweep stale dir', dir, err)
		}
	}
}

export async function startEmbeddedPostgres(): Promise<string> {
	sweepStalePgDirs()
	const port = await getFreePort()
	databaseDir = mkdtempSync(join(tmpdir(), PG_DIR_PREFIX))

	pg = new EmbeddedPostgres({
		databaseDir,
		port,
		user: PG_USER,
		password: PG_PASSWORD,
		persistent: false,
		onLog: () => undefined,
		onError: (err) => console.error('[embedded-pg]', err),
	})

	await pg.initialise()
	await pg.start()
	await pg.createDatabase(TEST_DB_NAME)

	return `postgres://${PG_USER}:${PG_PASSWORD}@localhost:${port}/${TEST_DB_NAME}`
}

export async function stopEmbeddedPostgres(): Promise<void> {
	if (!pg) return
	const failures: string[] = []

	try {
		await pg.stop()
	} catch (err) {
		failures.push(`stop: ${(err as Error).message}`)
	}

	// The library's own fs.rm can lose the Windows file-lock race and leave the data
	// directory behind; run our own retry-tolerant cleanup so it never leaks.
	if (databaseDir && existsSync(databaseDir)) {
		try {
			removeDirWithRetry(databaseDir)
		} catch (err) {
			failures.push(`remove ${databaseDir}: ${(err as Error).message}`)
		}
	}

	pg = undefined
	databaseDir = undefined

	if (failures.length > 0) {
		console.warn('[embedded-pg] teardown completed with issues —', failures.join('; '))
	}
}
