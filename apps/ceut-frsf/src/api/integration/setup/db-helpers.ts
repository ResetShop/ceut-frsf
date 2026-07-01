import { PERMISSIONS_SEED_DATA } from '@contracts/permission/permission.constants'
import { authentication, authenticationRelations } from '@schema/authentication'
import { permission, permissionRelations } from '@schema/permission'
import { permissionRoute, permissionRouteRelations } from '@schema/permission-route'
import { refreshToken } from '@schema/refresh-token'
import { role, rolePermission, rolePermissionRelations, roleRelations } from '@schema/role'
import { user, userRelations, userRole, userRoleRelations } from '@schema/user'
import { eq, inArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { appEnv } from '../../config/app.env'
import { dbEnv } from '../../config/db.env'
import { createPasswordHasher } from '../../services/password/password-hasher'

const schema = {
	authentication,
	authenticationRelations,
	permission,
	permissionRelations,
	permissionRoute,
	permissionRouteRelations,
	refreshToken,
	role,
	rolePermission,
	roleRelations,
	rolePermissionRelations,
	user,
	userRole,
	userRelations,
	userRoleRelations,
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>

let testDb: TestDb | null = null

function getAdminPassword(): string {
	const password = appEnv.INTEGRATION_TEST_ADMIN_PASSWORD
	if (!password) {
		throw new Error('INTEGRATION_TEST_ADMIN_PASSWORD environment variable is required.')
	}
	return password
}

async function getAdminPasswordHash(): Promise<string> {
	// Routes through the production hasher (reads BCRYPT_COST=1 from the integration env)
	// so this module no longer imports bcryptjs directly — password-hasher.ts is the sole boundary.
	return createPasswordHasher()(getAdminPassword())
}

/**
 * Returns a Drizzle instance connected to the test database.
 * Reuses the same instance across calls within a test run.
 */
export function getTestDb(): TestDb {
	if (!testDb) {
		const connectionString = dbEnv.PG_TEST_CONNECTION_STRING
		if (!connectionString) {
			throw new Error('PG_TEST_CONNECTION_STRING environment variable is required.')
		}
		testDb = drizzle(connectionString, { schema })
	}
	return testDb
}

/**
 * Closes the test database connection pool.
 * Call this in a global afterAll to allow the process to exit cleanly.
 */
export async function closeTestDb(): Promise<void> {
	if (testDb) {
		await testDb.$client.end()
		testDb = null
	}
}

/**
 * Truncates all tables in the correct order to respect foreign key constraints.
 * Uses CASCADE to handle remaining FK dependencies.
 */
export async function truncateAllTables(db: TestDb): Promise<void> {
	await db.execute(sql`
		TRUNCATE TABLE
			role_history,
			role_permission_history,
			user_profile_history,
			user_role_history,
			user_status_history,
			permission_route,
			role_permission,
			user_role,
			refresh_token,
			authentication,
			permission,
			role,
			"user"
		CASCADE
	`)
}

/**
 * Returns the seeded admin user and role IDs from the test database.
 * Use this in beforeAll() instead of making HTTP list calls to resolve IDs.
 */
export async function getSeededAdminIds(db: TestDb): Promise<{ adminUserId: number; adminRoleId: number }> {
	const [adminUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, 'admin@sistema.com'))
	const [adminRole] = await db.select({ id: role.id }).from(role).where(eq(role.code, 'admin'))

	if (!adminUser || !adminRole) {
		throw new Error('Seeded admin user or role not found. Ensure global setup has run.')
	}

	return { adminUserId: adminUser.id, adminRoleId: adminRole.id }
}

/**
 * Returns the seeded restricted user credentials for 403 tests.
 * This user is created once in global setup — no per-test seeding needed.
 */
export function getRestrictedUserCredentials(): { email: string; password: string } {
	return { email: 'restricted@test.com', password: getAdminPassword() }
}

/**
 * Seeds the test database with base data:
 * - Admin user (admin@sistema.com) with all permissions
 * - Restricted user (restricted@test.com) with no permissions
 * - Administrator role, all permissions, and role-permission assignments
 */
export async function seedBaseData(db: TestDb): Promise<{ adminUserId: number; adminRoleId: number }> {
	const passwordHash = await getAdminPasswordHash()

	const [adminUser] = await db
		.insert(user)
		.values({
			firstName: 'Administrador',
			lastName: 'Sistema',
			email: 'admin@sistema.com',
		})
		.returning({ id: user.id })

	await db.insert(authentication).values({
		userId: adminUser.id,
		passwordHash,
		failedLoginAttempts: 0,
	})

	const [adminRole] = await db
		.insert(role)
		.values({
			name: 'Administrator',
			code: 'admin',
			description: 'System administrator with full access',
			removable: false,
		})
		.returning({ id: role.id })

	await db.insert(userRole).values({ userId: adminUser.id, roleId: adminRole.id })

	await db.insert(permission).values([...PERMISSIONS_SEED_DATA])

	const permissionNames = PERMISSIONS_SEED_DATA.map((p) => p.name)
	const createdPermissions = await db
		.select({ id: permission.id })
		.from(permission)
		.where(inArray(permission.name, permissionNames))

	const rolePermissionValues = createdPermissions.map((p) => ({
		roleId: adminRole.id,
		permissionId: p.id,
	}))
	await db.insert(rolePermission).values(rolePermissionValues)

	await seedRestrictedBaseUser(db, passwordHash)

	return { adminUserId: adminUser.id, adminRoleId: adminRole.id }
}

/**
 * Resets only the lockout state of the admin user's authentication record.
 * Use this instead of truncateAllTables + seedBaseData when only the lockout
 * fields need resetting (e.g., after account lockout tests).
 */
export async function resetAdminLockout(db: TestDb): Promise<void> {
	const [adminUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, 'admin@sistema.com'))
	if (!adminUser) return

	await db
		.update(authentication)
		.set({ failedLoginAttempts: 0, lockedUntil: null })
		.where(eq(authentication.userId, adminUser.id))
}

async function seedRestrictedBaseUser(db: TestDb, passwordHash: string): Promise<void> {
	const [restrictedUser] = await db
		.insert(user)
		.values({ firstName: 'Restricted', lastName: 'User', email: 'restricted@test.com' })
		.returning({ id: user.id })

	await db.insert(authentication).values({ userId: restrictedUser.id, passwordHash, failedLoginAttempts: 0 })

	const [restrictedRole] = await db
		.insert(role)
		.values({ name: 'Restricted', code: 'restricted', description: 'Role with no permissions', removable: true })
		.returning({ id: role.id })

	await db.insert(userRole).values({ userId: restrictedUser.id, roleId: restrictedRole.id })
}
