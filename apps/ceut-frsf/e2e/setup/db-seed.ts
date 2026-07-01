/**
 * Seeds the e2e fixture users directly via Drizzle. Runs inside Playwright's globalSetup, which
 * resolves workspace path aliases (`@resetshop/*`, `@config/*`, `@schema/*`) unreliably — so everything
 * here uses relative imports only.
 *
 * Hashing goes through the app's `createPasswordHasher()`, which reads the bcrypt cost from
 * `passwordEnv.BCRYPT_COST` (set to `1` by `configureE2eEnvVars` before this runs). All fixture users
 * share the same password (INTEGRATION_TEST_ADMIN_PASSWORD).
 */
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { createPasswordHasher } from '../../src/api/services/password/password-hasher'
import { PERMISSIONS_SEED_DATA } from '../../src/contracts/permission/permission.constants'
import { authentication } from '../../src/db/schema/authentication'
import { permission } from '../../src/db/schema/permission'
import { role, rolePermission } from '../../src/db/schema/role'
import { user, userRole } from '../../src/db/schema/user'

type Db = ReturnType<typeof drizzle>

interface SeedUserParams {
	email: string
	firstName: string
	lastName: string
	roleId: number
	passwordHash: string
	mustChangePassword?: boolean
}

/** Email addresses of the seeded fixture users, shared with auth-setup.ts and the specs. */
export const E2E_USERS = Object.freeze({
	admin: 'admin@sistema.com',
	noPermission: 'e2e-noperm@test.com',
	mustChange: 'e2e-mustchange@test.com',
	/** A plain non-admin user the admin can view/edit on the detail page (mutations are mocked in specs). */
	viewable: 'e2e-viewable@test.com',
} as const)

/** Result of seeding — IDs the specs need (published to process.env by global-setup). */
export interface SeededIds {
	viewableUserId: number
	adminUserId: number
}

/**
 * The shared fixture-user password. Throws (rather than silently using an empty string) when the env
 * var is missing, so a misconfigured run fails fast with a clear message instead of confusing auth errors.
 */
export function adminPassword(): string {
	const password = process.env['INTEGRATION_TEST_ADMIN_PASSWORD']
	if (!password) {
		throw new Error('INTEGRATION_TEST_ADMIN_PASSWORD is required for e2e (DB seed + fixture logins).')
	}
	return password
}

export async function seedE2eUsers(connectionString: string, password: string): Promise<SeededIds> {
	const db = drizzle(connectionString)
	try {
		const passwordHash = await createPasswordHasher()(password)
		const adminRoleId = await seedAdminRoleWithPermissions(db)
		const restrictedRoleId = await seedRole(db, 'Restricted', 'restricted', 'Role with no permissions', true)

		const adminUserId = await seedUser(db, {
			email: E2E_USERS.admin,
			firstName: 'Administrador',
			lastName: 'Sistema',
			roleId: adminRoleId,
			passwordHash,
		})
		await seedUser(db, {
			email: E2E_USERS.noPermission,
			firstName: 'No',
			lastName: 'Permission',
			roleId: restrictedRoleId,
			passwordHash,
		})
		await seedUser(db, {
			email: E2E_USERS.mustChange,
			firstName: 'Must',
			lastName: 'Change',
			roleId: adminRoleId,
			passwordHash,
			mustChangePassword: true,
		})
		const viewableUserId = await seedUser(db, {
			email: E2E_USERS.viewable,
			firstName: 'Vera',
			lastName: 'Viewable',
			roleId: restrictedRoleId,
			passwordHash,
		})

		// Extra users so the list spans more than one page (default page size 10) and pagination is exercised:
		// 4 named users + 8 bulk = 12 total. Fixed emails are safe because globalSetup drops all tables first.
		for (let i = 1; i <= 8; i += 1) {
			await seedUser(db, {
				email: `e2e-bulk-${i}@test.com`,
				firstName: `Bulk${i}`,
				lastName: 'User',
				roleId: restrictedRoleId,
				passwordHash,
			})
		}

		return { viewableUserId, adminUserId }
	} finally {
		await db.$client.end()
	}
}

async function seedRole(db: Db, name: string, code: string, description: string, removable: boolean): Promise<number> {
	const [created] = await db.insert(role).values({ name, code, description, removable }).returning({ id: role.id })
	return created.id
}

async function seedAdminRoleWithPermissions(db: Db): Promise<number> {
	const adminRoleId = await seedRole(db, 'Administrator', 'admin', 'System administrator with full access', false)
	await db.insert(permission).values([...PERMISSIONS_SEED_DATA])
	const names = PERMISSIONS_SEED_DATA.map((p) => p.name)
	const created = await db.select({ id: permission.id }).from(permission).where(inArray(permission.name, names))
	await db.insert(rolePermission).values(created.map((p) => ({ roleId: adminRoleId, permissionId: p.id })))
	return adminRoleId
}

async function seedUser(db: Db, params: SeedUserParams): Promise<number> {
	const [created] = await db
		.insert(user)
		.values({ firstName: params.firstName, lastName: params.lastName, email: params.email })
		.returning({ id: user.id })
	await db.insert(authentication).values({
		userId: created.id,
		passwordHash: params.passwordHash,
		mustChangePassword: params.mustChangePassword ?? false,
		failedLoginAttempts: 0,
	})
	await db.insert(userRole).values({ userId: created.id, roleId: params.roleId })
	return created.id
}
