import { UserStatus } from '@contracts/user/user.constants'
import { parseDurationToMs } from '@resetshop/util'
import { authentication } from '@schema/authentication'
import { user } from '@schema/user'
import { and, eq, ne, sql } from 'drizzle-orm'
import { BaseRepository, type BaseRepositoryDeps } from '../../helpers/base.repository'
import type { DrizzleTransaction, QueryExecutor } from '../../helpers/drizzle-postgres-connector'
import type { AuthConfig } from './auth.config'
import {
	type AuthenticationData,
	type AuthenticationRepository,
	type CreateInitialPasswordParams,
	type IncrementAttemptsResult,
} from './interfaces'

interface AuthenticationRepositoryDeps extends BaseRepositoryDeps {
	authConfig: AuthConfig
}

/**
 * Repository for authentication-related database operations.
 * Handles password hash storage, retrieval, and account lockout management.
 */
export class DrizzleAuthenticationRepository extends BaseRepository implements AuthenticationRepository {
	private readonly authConfig: AuthConfig

	constructor({ db, authConfig }: AuthenticationRepositoryDeps) {
		super({ db })
		this.authConfig = authConfig
	}

	/**
	 * Finds authentication data for a user by their ID.
	 * Used during login to retrieve the stored password hash and lockout status.
	 *
	 * @param userId - The user's primary key
	 * @returns Authentication data including password hash and lockout info, or null if not found
	 */
	public async findByUserId(userId: number): Promise<AuthenticationData | null> {
		const result = await this.db
			.select({
				id: authentication.id,
				userId: authentication.userId,
				passwordHash: authentication.passwordHash,
				failedLoginAttempts: authentication.failedLoginAttempts,
				lockedUntil: authentication.lockedUntil,
				mustChangePassword: authentication.mustChangePassword,
			})
			.from(authentication)
			.where(eq(authentication.userId, userId))
			.limit(1)

		if (result.length === 0) {
			return null
		}

		return {
			id: result[0].id,
			userId: result[0].userId,
			passwordHash: result[0].passwordHash,
			failedLoginAttempts: result[0].failedLoginAttempts ?? 0,
			lockedUntil: result[0].lockedUntil,
			mustChangePassword: result[0].mustChangePassword ?? false,
		}
	}

	/**
	 * Increments the failed login attempts counter for a user.
	 * Uses atomic SQL increment to prevent race conditions.
	 *
	 * @param userId - The user's primary key
	 * @returns The new failed attempts count after incrementing
	 */
	public async incrementFailedAttempts(userId: number): Promise<number> {
		const result = await this.db
			.update(authentication)
			.set({
				failedLoginAttempts: sql`COALESCE(${authentication.failedLoginAttempts}, 0) + 1`,
				updatedAt: new Date(),
			})
			.where(eq(authentication.userId, userId))
			.returning({ failedLoginAttempts: authentication.failedLoginAttempts })

		return result[0]?.failedLoginAttempts ?? 1
	}

	/**
	 * Locks a user's account until the specified time.
	 * Called when max failed attempts threshold is reached.
	 *
	 * @param userId - The user's primary key
	 * @param lockedUntil - The timestamp when the lockout expires
	 */
	public async lockAccount(userId: number, lockedUntil: Date): Promise<void> {
		await this.db
			.update(authentication)
			.set({
				lockedUntil,
				updatedAt: new Date(),
			})
			.where(eq(authentication.userId, userId))
	}

	/**
	 * Resets the failed login attempts counter and clears any lockout.
	 * Called on successful authentication.
	 *
	 * @param userId - The user's primary key
	 */
	public async resetFailedAttempts(userId: number): Promise<void> {
		await this.db
			.update(authentication)
			.set({
				failedLoginAttempts: 0,
				lockedUntil: null,
				updatedAt: new Date(),
			})
			.where(eq(authentication.userId, userId))
	}

	/**
	 * Atomically increments failed login attempts and locks account if threshold is reached.
	 * Uses database transaction to ensure both operations succeed or fail together,
	 * preventing race conditions during concurrent login attempts.
	 *
	 * @param userId - The user's primary key
	 * @returns Result containing new attempt count, lock status, and lockout timestamp
	 */
	public async incrementAndLockIfNeeded(userId: number): Promise<IncrementAttemptsResult> {
		return this.db.transaction(async (tx) => {
			const incrementResult = await tx
				.update(authentication)
				.set({
					failedLoginAttempts: sql`COALESCE(${authentication.failedLoginAttempts}, 0) + 1`,
					updatedAt: new Date(),
				})
				.where(eq(authentication.userId, userId))
				.returning({ failedLoginAttempts: authentication.failedLoginAttempts })

			const newAttemptCount = incrementResult[0]?.failedLoginAttempts ?? 1

			if (newAttemptCount >= this.authConfig.maxFailedAttempts) {
				const lockedUntil = new Date(Date.now() + parseDurationToMs(this.authConfig.lockoutDuration))
				await tx
					.update(authentication)
					.set({
						lockedUntil,
						updatedAt: new Date(),
					})
					.where(eq(authentication.userId, userId))

				return {
					failedAttempts: newAttemptCount,
					wasLocked: true,
					lockedUntil,
				}
			}

			return {
				failedAttempts: newAttemptCount,
				wasLocked: false,
			}
		})
	}

	/**
	 * Inserts the initial authentication row for a newly-created user.
	 *
	 * @param params - The user ID, password hash, and must-change-password flag
	 * @param tx - Optional transaction handle for composing with the user insert
	 */
	public async createInitialPassword(params: CreateInitialPasswordParams, tx?: DrizzleTransaction): Promise<void> {
		const executor: QueryExecutor = tx ?? this.db
		await executor.insert(authentication).values({
			userId: params.userId,
			passwordHash: params.passwordHash,
			mustChangePassword: params.mustChangePassword,
		})
	}

	/**
	 * Replaces a user's password hash and sets the must-change-password flag.
	 * Skips deleted users via a joined check on the `user` table.
	 *
	 * @param userId - The user's primary key
	 * @param passwordHash - The new bcrypt password hash
	 * @param mustChangePassword - Whether the user must change the password on next login
	 * @param tx - Optional transaction handle for composing with other writes
	 * @returns true if updated, false if the user does not exist or is deleted
	 */
	public async setPassword(
		userId: number,
		passwordHash: string,
		mustChangePassword: boolean,
		tx?: DrizzleTransaction,
	): Promise<boolean> {
		const executor: QueryExecutor = tx ?? this.db
		const exists = await executor
			.select({ id: user.id })
			.from(user)
			.where(and(eq(user.id, userId), ne(user.status, UserStatus.DELETED)))
			.limit(1)
		if (exists.length === 0) return false

		const now = new Date()
		await executor
			.update(authentication)
			.set({ passwordHash, mustChangePassword, lastPasswordChangedAt: now, updatedAt: now })
			.where(eq(authentication.userId, userId))

		return true
	}
}
