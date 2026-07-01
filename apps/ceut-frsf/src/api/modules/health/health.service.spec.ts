import { parseDurationToMs } from '@resetshop/util'
import { advanceTimersByTimeAsync, clearAllMocks, fn, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HEALTH_CHECK_TIMEOUT, HealthStatus } from './health.constants'
import { HealthService } from './health.service'

describe('HealthService', () => {
	let healthService: HealthService
	const mockExecute = fn<[unknown], Promise<unknown>>()

	beforeEach(() => {
		clearAllMocks()
		healthService = new HealthService({ db: { execute: mockExecute } as never })
	})

	afterEach(() => {
		useRealTimers()
	})

	describe('checkHealth', () => {
		it('should return healthy status when database responds', async () => {
			mockExecute.mockResolvedValue([{ '?column?': 1 }])

			const result = await healthService.checkHealth()

			expect(result.status).toBe(HealthStatus.HEALTHY)
			expect(result.checks.database.status).toBe(HealthStatus.HEALTHY)
			expect(result.checks.database.responseTimeMs).toBeGreaterThanOrEqual(0)
			expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date')
		})

		it('should return unhealthy status when database throws', async () => {
			mockExecute.mockRejectedValue(new Error('Connection refused'))

			const result = await healthService.checkHealth()

			expect(result.status).toBe(HealthStatus.UNHEALTHY)
			expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY)
			expect(result.checks.database).toHaveProperty('error', 'Connection refused')
		})

		it('should return unhealthy status with timeout error when database hangs', async () => {
			useFakeTimers()

			// eslint-disable-next-line @typescript-eslint/no-empty-function
			mockExecute.mockImplementation(() => new Promise<unknown>(() => {}))

			const healthPromise = healthService.checkHealth()

			await advanceTimersByTimeAsync(parseDurationToMs(HEALTH_CHECK_TIMEOUT))

			const result = await healthPromise

			expect(result.status).toBe(HealthStatus.UNHEALTHY)
			expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY)
			expect(result.checks.database).toHaveProperty('error', 'Database health check timed out')
		})

		it('should include responseTimeMs in healthy result', async () => {
			mockExecute.mockResolvedValue([{ '?column?': 1 }])

			const result = await healthService.checkHealth()

			expect(typeof result.checks.database.responseTimeMs).toBe('number')
			expect(result.checks.database.responseTimeMs).toBeGreaterThanOrEqual(0)
		})

		it('should include a valid ISO timestamp', async () => {
			mockExecute.mockResolvedValue([{ '?column?': 1 }])

			const result = await healthService.checkHealth()

			expect(result.timestamp).toBe(new Date(result.timestamp).toISOString())
		})
	})
})
