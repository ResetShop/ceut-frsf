import { fn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HealthStatus } from './health.constants'
import type { HealthCheckResponse } from './interfaces'
import { verifyHealth, type VerifyHealthDependencies } from './verify-health'

/**
 * Mock HealthService class for testing verify-health functionality.
 * Tracks method calls and allows configuring return values.
 */
class MockHealthService {
	private response: HealthCheckResponse | null = null
	public readonly checkHealthCalls: Array<[]> = []

	/**
	 * Configure the response that checkHealth will return.
	 */
	public setResponse(response: HealthCheckResponse): void {
		this.response = response
	}

	/**
	 * Clear all tracking data.
	 */
	public clear(): void {
		this.response = null
		this.checkHealthCalls.length = 0
	}

	/**
	 * Mock implementation of checkHealth.
	 */
	public async checkHealth(): Promise<HealthCheckResponse> {
		this.checkHealthCalls.push([])
		if (!this.response) {
			throw new Error('MockHealthService: response not configured')
		}
		return this.response
	}
}

describe('verifyHealth', () => {
	let mockHealthService: MockHealthService
	let mockVerifyContainer: ReturnType<typeof fn<[], void>>
	let deps: VerifyHealthDependencies

	beforeEach(() => {
		mockHealthService = new MockHealthService()
		mockVerifyContainer = fn<[], void>()
		mockVerifyContainer.mockReturnValue(undefined)

		deps = {
			verifyContainer: mockVerifyContainer,
			resolveHealthService: () => mockHealthService as never,
		}
	})

	afterEach(() => {
		mockHealthService.clear()
		mockVerifyContainer.mockClear()
	})

	it('should pass when all health checks succeed', async () => {
		mockHealthService.setResponse({
			status: HealthStatus.HEALTHY,
			timestamp: new Date().toISOString(),
			checks: { database: { status: 'healthy', responseTimeMs: 5 } },
		})

		await expect(verifyHealth(deps)).resolves.toBeUndefined()
		expect(mockVerifyContainer.calls).toHaveLength(1)
		expect(mockHealthService.checkHealthCalls).toHaveLength(1)
	})

	it('should fail when container verification fails', async () => {
		mockVerifyContainer.mockImplementation(() => {
			throw new Error('Missing dependency: someService')
		})

		await expect(verifyHealth(deps)).rejects.toThrow('DI Container: Missing dependency: someService')
		expect(mockHealthService.checkHealthCalls).toHaveLength(0)
	})

	it('should fail when database health check fails', async () => {
		mockHealthService.setResponse({
			status: HealthStatus.UNHEALTHY,
			timestamp: new Date().toISOString(),
			checks: { database: { status: 'unhealthy', responseTimeMs: null, error: 'Connection refused' } },
		})

		await expect(verifyHealth(deps)).rejects.toThrow('PostgreSQL: Connection refused')
	})

	it('should run health checks in order', async () => {
		const callOrder: string[] = []

		mockVerifyContainer.mockImplementation(() => {
			callOrder.push('container')
		})

		const originalCheckHealth = mockHealthService.checkHealth.bind(mockHealthService)
		mockHealthService.checkHealth = async () => {
			callOrder.push('database')
			return originalCheckHealth()
		}

		mockHealthService.setResponse({
			status: HealthStatus.HEALTHY,
			timestamp: new Date().toISOString(),
			checks: { database: { status: 'healthy', responseTimeMs: 5 } },
		})

		await verifyHealth(deps)
		expect(callOrder).toEqual(['container', 'database'])
	})

	it('should stop on first failure', async () => {
		mockVerifyContainer.mockImplementation(() => {
			throw new Error('Container failed')
		})

		await expect(verifyHealth(deps)).rejects.toThrow()
		expect(mockHealthService.checkHealthCalls).toHaveLength(0)
	})
})
