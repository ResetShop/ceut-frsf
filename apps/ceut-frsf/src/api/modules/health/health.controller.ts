import { createOpenAPIApp, registerRoute } from '@resetshop/hono-core'
import { container } from '../../container/container'
import { HealthStatus } from './health.constants'
import { healthCheckRoute } from './health.routes'
import type { HealthCheckResponse } from './interfaces'

const app = createOpenAPIApp()

/**
 * Health check endpoint
 * GET /api/health/v1
 *
 * Returns application health status including database connectivity.
 * Responds with 200 when healthy, 503 when unhealthy.
 */
registerRoute(app, healthCheckRoute, async (c) => {
	const { healthService } = container.cradle
	const health = await healthService.checkHealth()
	const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503
	return c.json<HealthCheckResponse>(health, statusCode)
})

export default app
