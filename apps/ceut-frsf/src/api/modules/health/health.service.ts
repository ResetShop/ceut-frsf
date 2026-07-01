import { parseDurationToMs } from '@resetshop/util'
import { sql } from 'drizzle-orm'
import type { DrizzlePgConnector } from '../../helpers/drizzle-postgres-connector'
import { HEALTH_CHECK_TIMEOUT, HealthStatus } from './health.constants'
import type { DatabaseCheck, HealthCheckResponse } from './interfaces'

interface HealthServiceDeps {
	db: DrizzlePgConnector
}

/**
 * Service for checking application health status.
 * Performs lightweight database connectivity probes to verify system health.
 */
export class HealthService {
	private db: DrizzlePgConnector

	constructor({ db }: HealthServiceDeps) {
		this.db = db
	}

	/**
	 * Checks overall application health by probing all dependencies.
	 * Returns structured health status with individual component checks.
	 */
	public async checkHealth(): Promise<HealthCheckResponse> {
		const database = await this.checkDatabase()
		const status = database.status === HealthStatus.HEALTHY ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY

		return {
			status,
			timestamp: new Date().toISOString(),
			checks: { database },
		}
	}

	/**
	 * Probes PostgreSQL connectivity with a lightweight SELECT 1 query.
	 * Uses a timeout to avoid hanging when the database is unresponsive.
	 * Never throws — returns a structured result indicating success or failure.
	 */
	private async checkDatabase(): Promise<DatabaseCheck> {
		const start = Date.now()

		try {
			const timeout = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Database health check timed out')), parseDurationToMs(HEALTH_CHECK_TIMEOUT))
			})

			await Promise.race([this.db.execute(sql`SELECT 1`), timeout])

			return {
				status: HealthStatus.HEALTHY,
				responseTimeMs: Date.now() - start,
			}
		} catch (error) {
			const responseTimeMs = Date.now() - start
			return {
				status: HealthStatus.UNHEALTHY,
				responseTimeMs: responseTimeMs > 0 ? responseTimeMs : null,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}
}
