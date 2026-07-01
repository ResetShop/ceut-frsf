import { parseDurationToMs } from '@resetshop/util'
import { refreshToken } from '@schema/refresh-token'
import { user } from '@schema/user'
import { and, eq, inArray, lt, ne, sql } from 'drizzle-orm'
import { cronEnv } from '../../config/cron.env'
import { isServerless } from '../../config/http.env'
import { REFRESH_TOKEN_EXPIRY_BUFFER } from '../../constants/auth.constants'
import { BaseRepository } from '../../helpers/base.repository'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import {
	type CleanupResult,
	type CreateRefreshTokenParams,
	type RefreshTokenData,
	type RefreshTokenRepository,
	type RefreshTokenWithUser,
} from './interfaces'

// Token cleanup configuration - configurable via environment variables
const DEFAULT_DELETE_BATCH_SIZE = 1000
const DEFAULT_MAX_CLEANUP_BATCHES = 100 // Limit cleanup to 100k tokens per run to prevent indefinite execution
const MIN_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 10000
const MIN_MAX_BATCHES = 10
const MAX_MAX_BATCHES = 1000

/**
 * Get validated batch size from environment variable.
 * @returns Batch size clamped between MIN_BATCH_SIZE and MAX_BATCH_SIZE
 */
function getDeleteBatchSize(): number {
	const envValue = cronEnv.TOKEN_CLEANUP_BATCH_SIZE
	const raw = parseInt(envValue ?? '', 10)

	if (!Number.isFinite(raw)) {
		if (envValue) {
			console.warn(
				`[TokenCleanup] TOKEN_CLEANUP_BATCH_SIZE="${envValue}" is invalid. Using default: ${DEFAULT_DELETE_BATCH_SIZE}`,
			)
		}
		return DEFAULT_DELETE_BATCH_SIZE
	}

	const clamped = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, raw))
	if (clamped !== raw) {
		console.warn(
			`[TokenCleanup] TOKEN_CLEANUP_BATCH_SIZE=${raw} out of range (${MIN_BATCH_SIZE}-${MAX_BATCH_SIZE}). Using: ${clamped}`,
		)
	}
	return clamped
}

/**
 * Get validated max cleanup batches from environment variable.
 * @returns Max batches clamped between MIN_MAX_BATCHES and MAX_MAX_BATCHES
 */
function getMaxCleanupBatches(): number {
	const envValue = cronEnv.TOKEN_CLEANUP_MAX_BATCH_COUNT
	const raw = parseInt(envValue ?? '', 10)

	if (!Number.isFinite(raw)) {
		if (envValue) {
			console.warn(
				`[TokenCleanup] TOKEN_CLEANUP_MAX_BATCH_COUNT="${envValue}" is invalid. Using default: ${DEFAULT_MAX_CLEANUP_BATCHES}`,
			)
		}
		return DEFAULT_MAX_CLEANUP_BATCHES
	}

	const clamped = Math.max(MIN_MAX_BATCHES, Math.min(MAX_MAX_BATCHES, raw))
	if (clamped !== raw) {
		console.warn(
			`[TokenCleanup] TOKEN_CLEANUP_MAX_BATCH_COUNT=${raw} out of range (${MIN_MAX_BATCHES}-${MAX_MAX_BATCHES}). Using: ${clamped}`,
		)
	}
	return clamped
}

// Advisory lock key for token cleanup
// Using a hash-like number derived from 'refresh_token_cleanup' to avoid collisions
// with other advisory locks in the same database
const TOKEN_CLEANUP_LOCK_KEY = 0x5246544b // "RFTK" in hex (Refresh Token Cleanup Key)

/**
 * Repository for refresh token database operations.
 * Handles token lifecycle including creation, validation, revocation, and cleanup.
 * Supports both traditional and serverless environments with appropriate locking strategies.
 */
export class DrizzleRefreshTokenRepository extends BaseRepository implements RefreshTokenRepository {
	/**
	 * Try to acquire a PostgreSQL advisory lock for token cleanup.
	 * Non-blocking - returns immediately with true/false.
	 * Works across multiple server instances sharing the same database.
	 *
	 * Lock type is chosen based on environment:
	 * - Traditional servers (IS_SERVERLESS !== 'true'): Uses session-level lock (pg_try_advisory_lock)
	 *   that persists until explicitly released or session ends.
	 * - Serverless (IS_SERVERLESS === 'true'): Uses transaction-scoped lock (pg_try_advisory_xact_lock)
	 *   that auto-releases when the transaction/request completes. This prevents lock leaks
	 *   in connection-pooled environments like PgBouncer transaction mode.
	 *
	 * @returns true if lock acquired, false if already locked by another process
	 */
	public async tryAcquireCleanupLock(): Promise<boolean> {
		// Use transaction-scoped locks in serverless to prevent lock leaks with connection pooling
		const lockFunction = isServerless() ? 'pg_try_advisory_xact_lock' : 'pg_try_advisory_lock'
		const result = await this.db.execute(sql.raw(`SELECT ${lockFunction}(${TOKEN_CLEANUP_LOCK_KEY}) as locked`))
		const row = result.rows[0] as { locked: boolean | null | undefined } | undefined
		if (!row || typeof row.locked !== 'boolean') {
			throw new Error('Failed to acquire advisory lock: unexpected result format')
		}
		return row.locked
	}

	/**
	 * Release the PostgreSQL advisory lock for token cleanup.
	 * Only needed for session-level locks (traditional servers).
	 * In serverless mode, transaction-scoped locks auto-release, so this is a no-op.
	 */
	public async releaseCleanupLock(): Promise<void> {
		// Transaction-scoped locks (xact) auto-release - no need to explicitly unlock
		if (isServerless()) {
			return
		}
		await this.db.execute(sql`SELECT pg_advisory_unlock(${TOKEN_CLEANUP_LOCK_KEY})`)
	}
	/**
	 * Find refresh token by its hash with the owning user's profile in a single joined query.
	 * Reduces the token refresh flow from 2 sequential queries to 1.
	 *
	 * Relies on the FK CASCADE between refresh_token.userId and user.id —
	 * if the user is hard-deleted, the CASCADE removes their tokens so this JOIN returns null.
	 *
	 * @param tokenHash Hash of the token to find
	 * @returns Token data with user profile, or null if not found
	 */
	public async findByTokenHashWithUser(tokenHash: string): Promise<RefreshTokenWithUser | null> {
		const result = await this.db
			.select({
				token: {
					id: refreshToken.id,
					userId: refreshToken.userId,
					tokenFamily: refreshToken.tokenFamily,
					tokenHash: refreshToken.tokenHash,
					expiresAt: refreshToken.expiresAt,
					isRevoked: refreshToken.isRevoked,
					createdAt: refreshToken.createdAt,
					revokedAt: refreshToken.revokedAt,
				},
				user: {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					status: user.status,
				},
			})
			.from(refreshToken)
			.innerJoin(user, eq(refreshToken.userId, user.id))
			.where(eq(refreshToken.tokenHash, tokenHash))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Create a new refresh token.
	 * Accepts an optional `tx` so the caller can compose the insert into a transaction
	 * (e.g. password change rotates the token alongside the password write atomically).
	 * @param params Parameters for the new token. See the CreateRefreshTokenParams interface for details.
	 * @param tx Optional transaction handle; falls back to the pooled connection.
	 */
	public async create(params: CreateRefreshTokenParams, tx?: DrizzleTransaction): Promise<RefreshTokenData> {
		const executor = tx ?? this.db
		const result = await executor
			.insert(refreshToken)
			.values({
				userId: params.userId,
				tokenFamily: params.tokenFamily,
				tokenHash: params.tokenHash,
				expiresAt: params.expiresAt,
			})
			.returning()

		return result[0]
	}

	/**
	 * Revoke a specific refresh token
	 * @param tokenId of the token to revoke
	 */
	public async revokeToken(tokenId: number): Promise<void> {
		await this.db
			.update(refreshToken)
			.set({
				isRevoked: true,
				revokedAt: new Date(),
			})
			.where(eq(refreshToken.id, tokenId))
	}

	/**
	 * Revoke all refresh tokens for a user (for logout)
	 * @param userId User ID to revoke tokens for
	 */
	public async revokeAllForUser(userId: number): Promise<void> {
		await this.db
			.update(refreshToken)
			.set({
				isRevoked: true,
				revokedAt: new Date(),
			})
			.where(eq(refreshToken.userId, userId))
	}

	/**
	 * Revoke every refresh token for a user EXCEPT the one whose hash is `exceptTokenHash`.
	 * Used by the change-password flow to invalidate other sessions while keeping the current
	 * one alive (the current token is rotated separately within the same transaction).
	 * @param userId User ID whose other tokens should be revoked
	 * @param exceptTokenHash Hash of the token to preserve (the caller's current session)
	 * @param tx Optional transaction handle; falls back to the pooled connection.
	 */
	public async revokeAllForUserExcept(userId: number, exceptTokenHash: string, tx?: DrizzleTransaction): Promise<void> {
		const executor = tx ?? this.db
		await executor
			.update(refreshToken)
			.set({
				isRevoked: true,
				revokedAt: new Date(),
			})
			.where(and(eq(refreshToken.userId, userId), ne(refreshToken.tokenHash, exceptTokenHash)))
	}

	/**
	 * Revoke all refresh tokens in a token family.
	 * Used for token reuse detection: when a revoked token is replayed,
	 * the entire family is revoked to protect against stolen tokens.
	 * @param tokenFamily Token family identifier to revoke
	 */
	public async revokeTokenFamily(tokenFamily: string): Promise<void> {
		await this.db
			.update(refreshToken)
			.set({ isRevoked: true, revokedAt: new Date() })
			.where(eq(refreshToken.tokenFamily, tokenFamily))
	}

	/**
	 * Delete all expired refresh tokens for a user
	 * @param userId User ID to delete expired tokens for
	 * @returns Count of deleted tokens
	 */
	public async deleteExpiredTokensForUser(userId: number): Promise<number> {
		const result = await this.db
			.delete(refreshToken)
			.where(and(eq(refreshToken.userId, userId), lt(refreshToken.expiresAt, new Date())))
			.returning({ id: refreshToken.id })

		return result.length
	}

	/**
	 * Delete all expired refresh tokens globally.
	 * Uses batch deletion to avoid locking the table for large datasets.
	 * Limited to a configurable max batches to prevent indefinite execution.
	 *
	 * Only deletes tokens that expired at least 1 hour ago to prevent race conditions
	 * where a token might be deleted while a refresh operation is in progress.
	 *
	 * Configuration via environment variables:
	 * - TOKEN_CLEANUP_BATCH_SIZE: Tokens per batch (default: 1000, range: 100-10000)
	 * - TOKEN_CLEANUP_MAX_BATCH_COUNT: Max iterations (default: 100, range: 10-1000)
	 *
	 * @returns CleanupResult with count of deleted tokens and incomplete flag
	 */
	public async deleteAllExpiredTokens(): Promise<CleanupResult> {
		const batchSize = getDeleteBatchSize()
		const maxBatches = getMaxCleanupBatches()

		let totalDeleted = 0
		let batchCount = 0

		// Only delete tokens expired at least REFRESH_TOKEN_EXPIRY_BUFFER ago to avoid race conditions
		const cutoffTime = new Date(Date.now() - parseDurationToMs(REFRESH_TOKEN_EXPIRY_BUFFER))

		while (batchCount < maxBatches) {
			// Select a batch of expired token IDs (with buffer)
			const expiredBatch = await this.db
				.select({ id: refreshToken.id })
				.from(refreshToken)
				.where(lt(refreshToken.expiresAt, cutoffTime))
				.limit(batchSize)

			if (!expiredBatch || expiredBatch.length === 0) {
				break
			}

			// Delete the batch by IDs
			const idsToDelete = expiredBatch.map((t) => t.id)
			await this.db.delete(refreshToken).where(inArray(refreshToken.id, idsToDelete))

			totalDeleted += expiredBatch.length
			batchCount++

			// If we got fewer than batch size, we're done
			if (expiredBatch.length < batchSize) {
				break
			}
		}

		const incomplete = batchCount >= maxBatches
		if (incomplete) {
			console.warn(`[TokenCleanup] Reached max batch limit (${maxBatches}). Some expired tokens may remain.`)
		}

		return { deletedCount: totalDeleted, incomplete }
	}
}
