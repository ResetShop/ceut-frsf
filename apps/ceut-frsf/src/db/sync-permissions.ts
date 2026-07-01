import { createDrizzlePgConnector } from '../api/helpers/drizzle-postgres-connector'
import { PERMISSIONS_SEED_DATA } from '../contracts/permission/permission.constants'
import { permission } from './schema/permission'

/**
 * Incremental permission sync script.
 *
 * Reads PERMISSIONS_SEED_DATA (derived from PERMISSION_DEFINITIONS in contracts),
 * compares with the database, inserts missing permissions, and warns about orphans.
 *
 * Does NOT modify role-permission assignments — that's a separate admin action.
 *
 * Usage:
 *   npm run sync:permissions        (uses environment config)
 *   npm run sync:permissions:local  (uses .env file)
 */

function computeMissing(existingNames: Set<string>) {
	return PERMISSIONS_SEED_DATA.filter((p) => !existingNames.has(p.name))
}

function computeOrphaned(existingNames: Set<string>) {
	const codeNames = new Set<string>(PERMISSIONS_SEED_DATA.map((p) => p.name))
	return [...existingNames].filter((name) => !codeNames.has(name))
}

async function syncPermissions(): Promise<void> {
	const db = createDrizzlePgConnector()

	try {
		console.log('[sync-permissions] Querying existing permissions...')
		const existing = await db.select({ name: permission.name }).from(permission)
		const existingNames = new Set(existing.map((p) => p.name))

		const missing = computeMissing(existingNames)
		const orphaned = computeOrphaned(existingNames)

		if (missing.length > 0) {
			await db
				.insert(permission)
				.values([...missing])
				.onConflictDoNothing()
			const names = missing.map((p) => p.name).join(', ')
			console.log(`[sync-permissions] Added ${missing.length} new permissions: ${names}`)
		} else {
			console.log('[sync-permissions] All permissions are in sync.')
		}

		if (orphaned.length > 0) {
			for (const name of orphaned) {
				console.warn(`[sync-permissions] Orphaned permission in DB (not in code): ${name}`)
			}
		}

		console.log(`[sync-permissions] Done. ${existingNames.size + missing.length} total, ${orphaned.length} orphaned.`)
	} finally {
		await db.$client.end()
	}
}

syncPermissions()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[sync-permissions] Failed:', error)
		process.exit(1)
	})
