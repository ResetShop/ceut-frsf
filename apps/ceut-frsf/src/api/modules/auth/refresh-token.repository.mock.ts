import type { UserStatus } from '@contracts/user/user.constants'
import { parseDurationToMs } from '@resetshop/util'
import { REFRESH_TOKEN_EXPIRY_BUFFER } from '../../constants/auth.constants'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import {
	type CleanupResult,
	type CreateRefreshTokenParams,
	type RefreshTokenData,
	type RefreshTokenRepository,
	type RefreshTokenWithUser,
} from './interfaces'

interface MockUserData {
	id: number
	email: string
	firstName: string
	lastName: string
	status: UserStatus
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
	private tokens: Map<string, RefreshTokenData> = new Map()
	private tokensById: Map<number, RefreshTokenData> = new Map()
	private users: Map<number, MockUserData> = new Map()
	private tokenIdCounter = 1

	// Track method calls for assertions
	public readonly revokedTokenIds: number[] = []
	public readonly revokedUserIds: number[] = []
	public readonly revokedUserExceptCalls: Array<{ userId: number; exceptTokenHash: string }> = []
	public readonly deletedExpiredForUsers: number[] = []
	public readonly revokedTokenFamilies: string[] = []
	public readonly createdTokens: RefreshTokenData[] = []
	public cleanupLockAcquired = false
	public deleteAllExpiredCalled = false
	public releaseCleanupLockError: Error | null = null

	/**
	 * Add a token to the mock repository.
	 * @param tokenHash Hash of the token
	 * @param data Partial token data (defaults will be applied)
	 * @returns The created token data
	 */
	public addToken(tokenHash: string, data: Partial<RefreshTokenData> = {}): RefreshTokenData {
		const token: RefreshTokenData = {
			id: data.id ?? this.tokenIdCounter++,
			userId: data.userId ?? 1,
			tokenFamily: data.tokenFamily ?? 'test-family',
			tokenHash,
			expiresAt: data.expiresAt ?? new Date(Date.now() + parseDurationToMs('1d')),
			isRevoked: data.isRevoked ?? false,
			createdAt: data.createdAt ?? new Date(),
			revokedAt: data.revokedAt ?? null,
		}
		this.tokens.set(tokenHash, token)
		this.tokensById.set(token.id, token)
		return token
	}

	/**
	 * Register a user for joined queries (findByTokenHashWithUser).
	 */
	public setUser(userData: MockUserData): void {
		this.users.set(userData.id, userData)
	}

	/**
	 * Remove a user from the mock (simulates user not found in joined query).
	 */
	public removeUser(userId: number): void {
		this.users.delete(userId)
	}

	/**
	 * Clear all tokens and reset tracking arrays.
	 */
	public clear(): void {
		this.tokens.clear()
		this.tokensById.clear()
		// users map is cleared — call setUser() again if findByTokenHashWithUser will be used
		this.users.clear()
		this.revokedTokenIds.length = 0
		this.revokedUserIds.length = 0
		this.revokedUserExceptCalls.length = 0
		this.deletedExpiredForUsers.length = 0
		this.revokedTokenFamilies.length = 0
		this.createdTokens.length = 0
		this.cleanupLockAcquired = false
		this.deleteAllExpiredCalled = false
		this.releaseCleanupLockError = null
		this.tokenIdCounter = 1
	}

	public async findByTokenHashWithUser(tokenHash: string): Promise<RefreshTokenWithUser | null> {
		const token = this.tokens.get(tokenHash)
		if (!token) return null
		const userData = this.users.get(token.userId)
		if (!userData) return null
		return { token, user: userData }
	}

	// The interface's optional `tx` is omitted here (fewer params is assignable) — standard in-memory double.
	public async create(params: CreateRefreshTokenParams): Promise<RefreshTokenData> {
		const token = this.addToken(params.tokenHash, {
			userId: params.userId,
			tokenFamily: params.tokenFamily,
			expiresAt: params.expiresAt,
		})
		this.createdTokens.push(token)
		return token
	}

	public async revokeAllForUserExcept(userId: number, exceptTokenHash: string): Promise<void> {
		this.revokedUserExceptCalls.push({ userId, exceptTokenHash })
		for (const token of this.tokens.values()) {
			if (token.userId === userId && token.tokenHash !== exceptTokenHash) {
				token.isRevoked = true
				token.revokedAt = new Date()
			}
		}
	}

	// Executes the callback inline with a stub tx — the mocked writes ignore it.
	public async runInTransaction<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T> {
		return fn(undefined as unknown as DrizzleTransaction)
	}

	public async revokeToken(tokenId: number): Promise<void> {
		this.revokedTokenIds.push(tokenId)
		const token = this.tokensById.get(tokenId)
		if (token) {
			token.isRevoked = true
			token.revokedAt = new Date()
		}
	}

	public async revokeAllForUser(userId: number): Promise<void> {
		this.revokedUserIds.push(userId)
		for (const token of this.tokens.values()) {
			if (token.userId === userId) {
				token.isRevoked = true
				token.revokedAt = new Date()
			}
		}
	}

	public async revokeTokenFamily(tokenFamily: string): Promise<void> {
		this.revokedTokenFamilies.push(tokenFamily)
		for (const token of this.tokens.values()) {
			if (token.tokenFamily === tokenFamily) {
				token.isRevoked = true
				token.revokedAt = new Date()
			}
		}
	}

	public async deleteExpiredTokensForUser(userId: number): Promise<number> {
		this.deletedExpiredForUsers.push(userId)
		// Count and remove expired tokens
		let count = 0
		const now = new Date()
		for (const [hash, token] of this.tokens.entries()) {
			if (token.userId === userId && token.expiresAt < now) {
				this.tokens.delete(hash)
				this.tokensById.delete(token.id)
				count++
			}
		}
		return count
	}

	public async tryAcquireCleanupLock(): Promise<boolean> {
		if (this.cleanupLockAcquired) {
			return false
		}
		this.cleanupLockAcquired = true
		return true
	}

	public async releaseCleanupLock(): Promise<void> {
		if (this.releaseCleanupLockError) {
			throw this.releaseCleanupLockError
		}
		this.cleanupLockAcquired = false
	}

	public async deleteAllExpiredTokens(): Promise<CleanupResult> {
		this.deleteAllExpiredCalled = true
		// Count and remove tokens expired at least REFRESH_TOKEN_EXPIRY_BUFFER ago (matches real repo)
		let count = 0
		const cutoffTime = new Date(Date.now() - parseDurationToMs(REFRESH_TOKEN_EXPIRY_BUFFER))
		for (const [hash, token] of this.tokens.entries()) {
			if (token.expiresAt < cutoffTime) {
				this.tokens.delete(hash)
				this.tokensById.delete(token.id)
				count++
			}
		}
		return { deletedCount: count, incomplete: false }
	}
}
