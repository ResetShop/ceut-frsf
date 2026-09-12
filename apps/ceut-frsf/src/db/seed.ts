import { eq, inArray } from 'drizzle-orm'
import { appEnv } from '../api/config/app.env'
import { isInteractive } from '../api/config/runtime'
import { createDrizzlePgConnector, type DrizzleTransaction } from '../api/helpers/drizzle-postgres-connector'
import { createPasswordHasher } from '../api/services/password/password-hasher'
import { CARD_PERMISSIONS, PERMISSIONS_SEED_DATA } from '../contracts/permission/permission.constants'
import { authentication } from './schema/authentication'
import { permission } from './schema/permission'
import { role, rolePermission } from './schema/role'
import { user, userRole } from './schema/user'
import { createDefaultPromptFn, resolveSeedAdminCredentials, type SeedAdminCredentials } from './seed-admin-credentials'

/**
 * Creates the admin user and its authentication record, or returns the existing user's id.
 *
 * Idempotent: when the admin already exists, the password is neither re-hashed nor overwritten —
 * the supplied credentials are ignored. The password is hashed (via the app's `createPasswordHasher`,
 * cost from `passwordEnv.BCRYPT_COST`) only on first creation.
 */
async function seedAdminUser(tx: DrizzleTransaction, credentials: SeedAdminCredentials): Promise<number> {
	const existing = await tx.select({ id: user.id }).from(user).where(eq(user.email, credentials.email))
	if (existing.length > 0) {
		console.log('✅ Admin user already exists — skipping credential setup')
		return existing[0].id
	}

	const inserted = await tx
		.insert(user)
		.values({ firstName: credentials.firstName, lastName: credentials.lastName, email: credentials.email })
		.returning({ id: user.id })
	if (!inserted.length) {
		throw new Error('Failed to create admin user')
	}

	const passwordHash = await createPasswordHasher()(credentials.password)
	await tx
		.insert(authentication)
		.values({ userId: inserted[0].id, passwordHash, mustChangePassword: false, failedLoginAttempts: 0 })
		.onConflictDoNothing()
	console.log('✅ Admin user and authentication record created')
	return inserted[0].id
}

/** Creates a role by `code`, or returns the existing role's id. Idempotent. */
async function seedRole(
	tx: DrizzleTransaction,
	params: { name: string; code: string; description: string; removable: boolean },
): Promise<number> {
	const existing = await tx.select({ id: role.id }).from(role).where(eq(role.code, params.code))
	if (existing.length > 0) {
		console.log(`✅ ${params.name} role already exists`)
		return existing[0].id
	}

	const inserted = await tx.insert(role).values(params).returning({ id: role.id })
	if (!inserted.length) {
		throw new Error(`Failed to create ${params.name} role`)
	}
	console.log(`✅ ${params.name} role created`)
	return inserted[0].id
}

/** Grants the given permission identifiers to a role, looking up their ids by name. Idempotent. */
async function grantPermissionsToRole(
	tx: DrizzleTransaction,
	roleId: number,
	permissionNames: readonly string[],
	roleLabel: string,
): Promise<void> {
	const rows = await tx.select({ id: permission.id }).from(permission).where(inArray(permission.name, permissionNames))
	if (rows.length !== permissionNames.length) {
		throw new Error(
			`Permission count mismatch for ${roleLabel} role: expected ${permissionNames.length}, got ${rows.length}`,
		)
	}

	const rolePermissionValues = rows.map((p) => ({ roleId, permissionId: p.id }))
	await tx.insert(rolePermission).values(rolePermissionValues).onConflictDoNothing()
	console.log(`✅ Permissions assigned to ${roleLabel} role`)
}

/** Inserts the permission catalogue and grants every permission to the Administrator role. */
async function seedPermissions(tx: DrizzleTransaction, adminRoleId: number): Promise<void> {
	await tx
		.insert(permission)
		.values([...PERMISSIONS_SEED_DATA])
		.onConflictDoNothing()
	console.log(`✅ ${PERMISSIONS_SEED_DATA.length} permissions created/verified`)

	const permissionNames = PERMISSIONS_SEED_DATA.map((p) => p.name)
	await grantPermissionsToRole(tx, adminRoleId, permissionNames, 'Administrator')
}

/** Runs the full bootstrap inside a transaction: admin user, role, role assignment, permissions. */
async function runSeedTransaction(tx: DrizzleTransaction, credentials: SeedAdminCredentials): Promise<void> {
	const adminUserId = await seedAdminUser(tx, credentials)
	const adminRoleId = await seedRole(tx, {
		name: 'Administrator',
		code: 'admin',
		description: 'System administrator with full access',
		removable: false,
	})
	await tx.insert(userRole).values({ userId: adminUserId, roleId: adminRoleId }).onConflictDoNothing()
	console.log('✅ Administrator role assigned to admin user')
	await seedPermissions(tx, adminRoleId)

	const editorRoleId = await seedRole(tx, {
		name: 'Editor',
		code: 'editor',
		description: 'Content editor scoped to card management',
		removable: true,
	})
	await grantPermissionsToRole(tx, editorRoleId, CARD_PERMISSIONS, 'Editor')
}

/**
 * Seeds a fresh database with the initial admin account, the Administrator role, the Editor
 * role, the permission catalogue, and their assignments — all inside a single transaction.
 *
 * Admin credentials are resolved via `resolveSeedAdminCredentials` (env → interactive prompt →
 * fail-fast); see `seed-admin-credentials.ts`.
 *
 * For an already-seeded database, do not re-run this script to pick up newly added
 * permissions — use `npm run sync:permissions` instead (see `sync-permissions.ts`), which
 * inserts any missing rows into the `permission` table. `sync-permissions.ts` intentionally
 * never touches `role` or `role_permission`, so granting a new permission (e.g. the
 * `content:cards:*` set) to an existing role on a deployed database remains a manual step via
 * the Roles UI/API.
 */
async function seed(): Promise<void> {
	const db = createDrizzlePgConnector()
	try {
		console.log('🌱 Starting database seed...')
		const interactive = isInteractive()
		const credentials = await resolveSeedAdminCredentials({
			envInput: {
				email: appEnv.SEED_ADMIN_EMAIL,
				password: appEnv.SEED_ADMIN_PASSWORD,
				firstName: appEnv.SEED_ADMIN_FIRST_NAME,
				lastName: appEnv.SEED_ADMIN_LAST_NAME,
			},
			isInteractive: interactive,
			promptFn: createDefaultPromptFn(),
		})

		await db.transaction((tx) => runSeedTransaction(tx, credentials))

		console.log('✅ Database seed completed successfully')
	} finally {
		await db.$client.end()
	}
}

seed()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('❌ Seed failed:', error)
		process.exit(1)
	})
