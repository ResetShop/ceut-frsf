export const HealthStatus = Object.freeze({
	HEALTHY: 'healthy',
	UNHEALTHY: 'unhealthy',
} as const)

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus]

/** Duration for database health check timeout. */
export const HEALTH_CHECK_TIMEOUT = '5s'
