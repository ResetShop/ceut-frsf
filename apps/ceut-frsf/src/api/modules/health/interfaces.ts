import type { HealthStatus } from './health.constants'

interface DatabaseCheckHealthy {
	readonly status: 'healthy'
	readonly responseTimeMs: number
}

interface DatabaseCheckUnhealthy {
	readonly status: 'unhealthy'
	readonly responseTimeMs: number | null
	readonly error: string
}

export type DatabaseCheck = DatabaseCheckHealthy | DatabaseCheckUnhealthy

export interface HealthCheckResponse {
	readonly status: HealthStatus
	readonly timestamp: string
	readonly checks: {
		readonly database: DatabaseCheck
	}
}

export interface HealthService {
	checkHealth(): Promise<HealthCheckResponse>
}
