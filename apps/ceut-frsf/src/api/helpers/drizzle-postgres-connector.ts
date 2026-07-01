import { logger } from '@resetshop/util'
import { authentication, authenticationRelations } from '@schema/authentication'
import { permission, permissionRelations } from '@schema/permission'
import { permissionRoute, permissionRouteRelations } from '@schema/permission-route'
import { refreshToken } from '@schema/refresh-token'
import { role, rolePermission, rolePermissionRelations, roleRelations } from '@schema/role'
import { roleHistory } from '@schema/role-history'
import { rolePermissionHistory } from '@schema/role-permission-history'
import { user, userRelations, userRole, userRoleRelations } from '@schema/user'
import { userProfileHistory } from '@schema/user-profile-history'
import { userRoleHistory } from '@schema/user-role-history'
import { userStatusHistory } from '@schema/user-status-history'
import { drizzle } from 'drizzle-orm/node-postgres'
import { dbEnv } from '../config/db.env'

// Schema object for Drizzle's relational query API
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
	roleHistory,
	rolePermissionHistory,
	user,
	userRole,
	userRelations,
	userRoleRelations,
	userProfileHistory,
	userRoleHistory,
	userStatusHistory,
}

/**
 * Builds the Drizzle Postgres connector, reading `PG_CONNECTION_STRING` from the validated
 * `dbEnv` proxy. Exposed as a factory (registered via `asFunction(...).singleton()` in the
 * container) so the connection string is read lazily on first cradle resolution — never at
 * module-eval time. This lets the Angular SSR prerender worker import the server bundle in an
 * env-less context without triggering a fatal env read.
 */
export function createDrizzlePgConnector() {
	const db = drizzle(dbEnv.PG_CONNECTION_STRING, { schema })
	// A pg Pool emits 'error' on an *idle* client when its connection drops (DB restart, network blip, or —
	// in e2e — the embedded Postgres shutting down at teardown). Without a listener, Node treats it as an
	// unhandled 'error' event and crashes the process; with one, it's a recoverable warning (the pool
	// reconnects on the next query). This is the listener the node-postgres docs recommend every Pool have.
	// Log only the message — the pg error carries the whole Client object, which floods the logs if dumped.
	db.$client.on('error', (error) => logger.warn('Database', `Idle Postgres client error: ${error.message}`))
	return db
}

// Type export for DI container
export type DrizzlePgConnector = ReturnType<typeof createDrizzlePgConnector>

// Transaction handle passed to a `db.transaction(async (tx) => ...)` callback.
// Derived from the connector so repositories can accept an optional `tx` for
// cross-repository composition without importing from drizzle-orm/node-postgres.
// Inner `Parameters<...>[0]` is the transaction callback; outer `[0]` is its `tx` argument.
export type DrizzleTransaction = Parameters<Parameters<DrizzlePgConnector['transaction']>[0]>[0]

/** A query runner that may be the pooled connection or an open transaction. */
export type QueryExecutor = DrizzlePgConnector | DrizzleTransaction
