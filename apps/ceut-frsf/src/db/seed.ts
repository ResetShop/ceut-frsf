import { eq, inArray } from 'drizzle-orm'
import { appEnv } from '../api/config/app.env'
import { isInteractive } from '../api/config/runtime'
import { createDrizzlePgConnector, type DrizzleTransaction } from '../api/helpers/drizzle-postgres-connector'
import { createPasswordHasher } from '../api/services/password/password-hasher'
import { PERMISSIONS_SEED_DATA } from '../contracts/permission/permission.constants'
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

/** Creates the Administrator role, or returns the existing role's id. */
async function seedAdminRole(tx: DrizzleTransaction): Promise<number> {
	const existing = await tx.select({ id: role.id }).from(role).where(eq(role.code, 'admin'))
	if (existing.length > 0) {
		console.log('✅ Administrator role already exists')
		return existing[0].id
	}

	const inserted = await tx
		.insert(role)
		.values({
			name: 'Administrator',
			code: 'admin',
			description: 'System administrator with full access',
			removable: false,
		})
		.returning({ id: role.id })
	if (!inserted.length) {
		throw new Error('Failed to create Administrator role')
	}
	console.log('✅ Administrator role created')
	return inserted[0].id
}

/** Inserts the permission catalogue and grants every permission to the Administrator role. */
async function seedPermissions(tx: DrizzleTransaction, adminRoleId: number): Promise<void> {
	await tx
		.insert(permission)
		.values([...PERMISSIONS_SEED_DATA])
		.onConflictDoNothing()

	const permissionNames = PERMISSIONS_SEED_DATA.map((p) => p.name)
	const created = await tx
		.select({ id: permission.id })
		.from(permission)
		.where(inArray(permission.name, permissionNames))
	if (created.length !== PERMISSIONS_SEED_DATA.length) {
		throw new Error(`Permission count mismatch: expected ${PERMISSIONS_SEED_DATA.length}, got ${created.length}`)
	}
	console.log(`✅ ${PERMISSIONS_SEED_DATA.length} permissions created/verified`)

	const rolePermissionValues = created.map((p) => ({ roleId: adminRoleId, permissionId: p.id }))
	await tx.insert(rolePermission).values(rolePermissionValues).onConflictDoNothing()
	console.log('✅ Permissions assigned to Administrator role')
}

/** Runs the full bootstrap inside a transaction: admin user, role, role assignment, permissions. */
async function runSeedTransaction(tx: DrizzleTransaction, credentials: SeedAdminCredentials): Promise<void> {
	const adminUserId = await seedAdminUser(tx, credentials)
	const adminRoleId = await seedAdminRole(tx)
	await tx.insert(userRole).values({ userId: adminUserId, roleId: adminRoleId }).onConflictDoNothing()
	console.log('✅ Administrator role assigned to admin user')
	await seedPermissions(tx, adminRoleId)
}

/**
 * Seeds a fresh database with the initial admin account, the Administrator role, the permission
 * catalogue, and their assignments — all inside a single transaction.
 *
 * Admin credentials are resolved via `resolveSeedAdminCredentials` (env → interactive prompt →
 * fail-fast); see `seed-admin-credentials.ts`. For adding new permissions to an existing database,
 * use `npm run sync:permissions` instead (see `src/db/sync-permissions.ts`).
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
