import { parseDurationToMs } from '@resetshop/util'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InMemoryRefreshTokenRepository } from './refresh-token.repository.mock'
import { TokenMaintenanceService } from './token-maintenance.service'

describe('TokenMaintenanceService', () => {
	let mockRefreshTokenRepo: InMemoryRefreshTokenRepository
	let service: TokenMaintenanceService

	beforeEach(() => {
		clearAllMocks()
		mockRefreshTokenRepo = new InMemoryRefreshTokenRepository()
		service = new TokenMaintenanceService({ refreshTokenRepository: mockRefreshTokenRepo })
	})

	afterEach(() => {
		mockRefreshTokenRepo.clear()
	})

	describe('cleanupExpiredTokens', () => {
		it('should acquire lock and delete all expired tokens', async () => {
			const result = await service.cleanupExpiredTokens()

			expect(mockRefreshTokenRepo.cleanupLockAcquired).toBe(false) // Lock released after cleanup
			expect(mockRefreshTokenRepo.deleteAllExpiredCalled).toBe(true)
			expect(result).not.toBeNull()
			expect(result?.deletedCount).toBeGreaterThanOrEqual(0)
			expect(result?.incomplete).toBe(false)
		})

		it('should return null when lock cannot be acquired', async () => {
			// Simulate another process holding the lock
			mockRefreshTokenRepo.cleanupLockAcquired = true

			const result = await service.cleanupExpiredTokens()

			expect(result).toBeNull()
			expect(mockRefreshTokenRepo.deleteAllExpiredCalled).toBe(false)
		})

		it('should release lock after successful cleanup', async () => {
			await service.cleanupExpiredTokens()

			// Lock should be released
			expect(mockRefreshTokenRepo.cleanupLockAcquired).toBe(false)
		})

		it('should delete expired tokens and return count', async () => {
			// Add some expired tokens
			mockRefreshTokenRepo.addToken('expired-1', {
				userId: 1,
				expiresAt: new Date(Date.now() - parseDurationToMs('1d')), // 1 day ago
			})
			mockRefreshTokenRepo.addToken('expired-2', {
				userId: 2,
				expiresAt: new Date(Date.now() - parseDurationToMs('1d')), // 1 day ago
			})
			mockRefreshTokenRepo.addToken('valid', {
				userId: 3,
				expiresAt: new Date(Date.now() + parseDurationToMs('1d')), // 1 day from now
			})

			const result = await service.cleanupExpiredTokens()

			expect(result?.deletedCount).toBe(2)
			expect(result?.incomplete).toBe(false)
		})

		it('should return cleanup result even when lock release fails', async () => {
			// Save original and replace with a mock that rejects
			const originalRelease = mockRefreshTokenRepo.releaseCleanupLock.bind(mockRefreshTokenRepo)
			const releaseFn = fn<[], Promise<void>>().mockRejectedValue(new Error('Connection lost'))
			mockRefreshTokenRepo.releaseCleanupLock = releaseFn

			try {
				const result = await service.cleanupExpiredTokens()

				expect(result).not.toBeNull()
				expect(result?.deletedCount).toBeGreaterThanOrEqual(0)
				expect(releaseFn.calls).toHaveLength(1)
			} finally {
				mockRefreshTokenRepo.releaseCleanupLock = originalRelease
			}
		})
	})
})
