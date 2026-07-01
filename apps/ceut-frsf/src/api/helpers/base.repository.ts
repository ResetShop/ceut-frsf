import { type DrizzlePgConnector, type DrizzleTransaction } from './drizzle-postgres-connector'

/**
 * Dependencies required by BaseRepository and inherited by all child repositories.
 * Child repositories inherit this constructor signature automatically via TypeScript's
 * class inheritance - no need to define constructors in child classes.
 */
export interface BaseRepositoryDeps {
	db: DrizzlePgConnector
}

/**
 * Base repository class for all repositories.
 * Uses Awilix PROXY injection mode - dependencies are passed via destructured constructor params.
 */
export abstract class BaseRepository {
	protected db: DrizzlePgConnector

	constructor({ db }: BaseRepositoryDeps) {
		this.db = db
	}

	/**
	 * Runs the given callback inside a database transaction, exposing the
	 * transaction handle so callers can compose writes across repositories
	 * (e.g. a service coordinating a user insert and an auth-row insert).
	 */
	public runInTransaction<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T> {
		return this.db.transaction(fn)
	}
}
