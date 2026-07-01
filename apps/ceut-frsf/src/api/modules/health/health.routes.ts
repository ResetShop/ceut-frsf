import { errorResponseSchema } from '@contracts/common/error.schemas'
import { createRoute } from '@hono/zod-openapi'
import { healthCheckResponseSchema } from './health.schemas'

export const healthCheckRoute = createRoute({
	method: 'get',
	path: '/v1',
	tags: ['Health'],
	summary: 'Health check',
	description: 'Returns application health status including database connectivity.',
	security: [],
	responses: {
		200: {
			description: 'Application is healthy',
			content: { 'application/json': { schema: healthCheckResponseSchema } },
		},
		503: {
			description: 'Application is unhealthy',
			content: { 'application/json': { schema: healthCheckResponseSchema } },
		},
		500: {
			description: 'Internal server error - unexpected database failure',
			content: { 'application/json': { schema: errorResponseSchema } },
		},
	},
})
