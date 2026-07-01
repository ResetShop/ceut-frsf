import { z } from 'zod'
import { HealthStatus } from './health.constants'

/** Zod schema matching the HealthCheckResponse interface in interfaces.ts. */
export const healthCheckResponseSchema = z.object({
	status: z.enum([HealthStatus.HEALTHY, HealthStatus.UNHEALTHY]),
	timestamp: z.string(),
	checks: z.object({
		database: z.union([
			z.object({
				status: z.literal(HealthStatus.HEALTHY),
				responseTimeMs: z.number(),
			}),
			z.object({
				status: z.literal(HealthStatus.UNHEALTHY),
				responseTimeMs: z.number().nullable(),
				error: z.string(),
			}),
		]),
	}),
})
