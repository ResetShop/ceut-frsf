import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { container } from '../../container/container'
import { InMemoryContainer } from '../../container/container.mock'
import { HealthStatus } from './health.constants'
import healthController from './health.controller'
import type { HealthCheckResponse } from './interfaces'

describe('Health Controller', () => {
	const mockCheckHealth = fn<[], Promise<HealthCheckResponse>>()

	beforeEach(() => {
		clearAllMocks()

		container.use(
			new InMemoryContainer({
				healthService: {
					checkHealth: mockCheckHealth,
				},
			}),
		)
	})

	afterEach(() => {
		container.restore()
	})

	it('should return 200 with healthy response', async () => {
		const healthyResponse: HealthCheckResponse = {
			status: HealthStatus.HEALTHY,
			timestamp: new Date().toISOString(),
			checks: {
				database: { status: 'healthy', responseTimeMs: 5 },
			},
		}
		mockCheckHealth.mockResolvedValue(healthyResponse)

		const res = await healthController.request('/v1')

		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.status).toBe('healthy')
		expect(data.checks.database.status).toBe('healthy')
		expect(data.checks.database.responseTimeMs).toBe(5)
	})

	it('should return 503 with unhealthy response', async () => {
		const unhealthyResponse: HealthCheckResponse = {
			status: HealthStatus.UNHEALTHY,
			timestamp: new Date().toISOString(),
			checks: {
				database: { status: 'unhealthy', responseTimeMs: null, error: 'Connection refused' },
			},
		}
		mockCheckHealth.mockResolvedValue(unhealthyResponse)

		const res = await healthController.request('/v1')

		expect(res.status).toBe(503)
		const data = await res.json()
		expect(data.status).toBe('unhealthy')
		expect(data.checks.database.error).toBe('Connection refused')
	})

	it('should return JSON content type', async () => {
		const healthyResponse: HealthCheckResponse = {
			status: HealthStatus.HEALTHY,
			timestamp: new Date().toISOString(),
			checks: {
				database: { status: 'healthy', responseTimeMs: 3 },
			},
		}
		mockCheckHealth.mockResolvedValue(healthyResponse)

		const res = await healthController.request('/v1')

		expect(res.headers.get('content-type')).toContain('application/json')
	})

	it('should include a valid ISO timestamp', async () => {
		const healthyResponse: HealthCheckResponse = {
			status: HealthStatus.HEALTHY,
			timestamp: new Date().toISOString(),
			checks: {
				database: { status: 'healthy', responseTimeMs: 2 },
			},
		}
		mockCheckHealth.mockResolvedValue(healthyResponse)

		const res = await healthController.request('/v1')
		const data = await res.json()

		const timestamp = new Date(data.timestamp)
		expect(timestamp.toString()).not.toBe('Invalid Date')
		expect(data.timestamp).toBe(timestamp.toISOString())
	})
})
