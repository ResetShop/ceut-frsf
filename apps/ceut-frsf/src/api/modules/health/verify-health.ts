import { container } from '../../container/container'
import { HealthStatus } from './health.constants'
import type { HealthService } from './interfaces'

/**
 * Result of a single health check probe.
 */
interface HealthCheckResult {
	readonly name: string
	readonly status: HealthStatus
	readonly message: string
	readonly durationMs?: number
}

/**
 * Interface for implementing startup health checks.
 */
interface HealthCheck {
	readonly name: string
	check(): Promise<HealthCheckResult>
}

/**
 * Dependencies for health verification.
 * Allows injection of mocks for testing.
 */
export interface VerifyHealthDependencies {
	verifyContainer: () => void
	resolveHealthService: () => HealthService
}

/**
 * Default production dependencies.
 */
const defaultDependencies: VerifyHealthDependencies = {
	verifyContainer: () => container.verify(),
	resolveHealthService: () => container.resolve('healthService'),
}

/**
 * Creates DI container health check.
 */
function createContainerHealthCheck(deps: VerifyHealthDependencies): HealthCheck {
	return {
		name: 'DI Container',
		async check(): Promise<HealthCheckResult> {
			const start = Date.now()
			try {
				deps.verifyContainer()
				return {
					name: this.name,
					status: HealthStatus.HEALTHY,
					message: 'All dependencies resolved',
					durationMs: Date.now() - start,
				}
			} catch (error) {
				return {
					name: this.name,
					status: HealthStatus.UNHEALTHY,
					message: error instanceof Error ? error.message : 'Unknown error',
					durationMs: Date.now() - start,
				}
			}
		},
	}
}

/**
 * Creates PostgreSQL database health check.
 */
function createDatabaseHealthCheck(deps: VerifyHealthDependencies): HealthCheck {
	return {
		name: 'PostgreSQL',
		async check(): Promise<HealthCheckResult> {
			const healthService = deps.resolveHealthService()
			const result = await healthService.checkHealth()
			const dbCheck = result.checks.database

			if (result.status === HealthStatus.HEALTHY) {
				return {
					name: this.name,
					status: HealthStatus.HEALTHY,
					message: 'Connected',
					durationMs: dbCheck.responseTimeMs,
				}
			}

			return {
				name: this.name,
				status: HealthStatus.UNHEALTHY,
				message: dbCheck.status === 'unhealthy' ? dbCheck.error : 'Connection failed',
				durationMs: dbCheck.responseTimeMs ?? undefined,
			}
		},
	}
}

/**
 * Runs all registered health checks at server startup.
 * Fails fast on the first unhealthy check, preventing the server from starting
 * in an invalid state.
 *
 * @param deps - Optional dependencies for testing
 * @throws {Error} if any health check fails
 */
export async function verifyHealth(deps: VerifyHealthDependencies = defaultDependencies): Promise<void> {
	const healthChecks = [createContainerHealthCheck(deps), createDatabaseHealthCheck(deps)]

	for (const healthCheck of healthChecks) {
		const result = await healthCheck.check()

		if (result.status === HealthStatus.UNHEALTHY) {
			throw new Error(`${result.name}: ${result.message}`)
		}

		const duration = result.durationMs !== undefined ? ` (${result.durationMs}ms)` : ''
		// REASON: Startup diagnostic — confirms system health before accepting traffic
		console.log(`✓ ${result.name}: ${result.message}${duration}`)
	}
}
