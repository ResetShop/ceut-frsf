import { logger } from '@resetshop/util'
import {
	type CleanupResult,
	type TokenMaintenanceService as ITokenMaintenanceService,
	type RefreshTokenRepository,
} from './interfaces'

interface TokenMaintenanceServiceDeps {
	refreshTokenRepository: RefreshTokenRepository
}

/**
 * Service for refresh-token maintenance.
 *
 * Owns the advisory-lock-guarded expired-token cleanup flow, keeping the core
 * `AuthService` focused on authentication. Implements the `TokenMaintenanceService`
 * interface (Interface Segregation) consumed by cron jobs and the cleanup endpoint.
 */
export class TokenMaintenanceService implements ITokenMaintenanceService {
	private readonly refreshTokenRepository: RefreshTokenRepository

	constructor({ refreshTokenRepository }: TokenMaintenanceServiceDeps) {
		this.refreshTokenRepository = refreshTokenRepository
	}

	/**
	 * Deletes all expired refresh tokens from the database.
	 * Uses PostgreSQL advisory lock to prevent concurrent executions across multiple server instances.
	 * Called by cron jobs and the manual cleanup endpoint.
	 *
	 * @returns CleanupResult with deleted count and incomplete flag, or null if skipped
	 *          due to concurrent execution or lock acquisition failure
	 */
	public async cleanupExpiredTokens(): Promise<CleanupResult | null> {
		// Try to acquire database-level lock (works across multiple server instances)
		let lockAcquired = false
		try {
			lockAcquired = await this.refreshTokenRepository.tryAcquireCleanupLock()
		} catch (error) {
			logger.error('TokenCleanup', 'Failed to acquire advisory lock', error)
			return null
		}

		if (!lockAcquired) {
			logger.info('TokenCleanup', 'Skipped - cleanup already in progress (another instance holds the lock)')
			return null
		}

		try {
			const startTime = Date.now()
			const result = await this.refreshTokenRepository.deleteAllExpiredTokens()
			const durationMs = Date.now() - startTime

			logger.security('token_cleanup', { deletedCount: result.deletedCount, durationMs, incomplete: result.incomplete })
			logger.info('TokenCleanup', `Deleted ${result.deletedCount} expired tokens in ${durationMs}ms`)
			if (result.incomplete) {
				logger.warn('TokenCleanup', 'Cleanup was incomplete - more expired tokens may remain')
			}
			return result
		} finally {
			try {
				await this.refreshTokenRepository.releaseCleanupLock()
			} catch (error) {
				// PostgreSQL session advisory locks are automatically released when the
				// database session/connection ends — the lock won't persist indefinitely.
				logger.error(
					'TokenCleanup',
					'Failed to release advisory lock. Lock will auto-release when DB session ends',
					error,
				)
			}
		}
	}
}
