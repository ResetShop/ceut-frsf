import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import {
	type CreatePasswordResetTokenParams,
	type PasswordResetTokenData,
	type PasswordResetTokenRepository,
} from './interfaces'

interface StoredResetToken {
	userId: number
	expiresAt: Date
	usedAt: Date | null
}

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
	private tokens: Map<string, StoredResetToken> = new Map()

	// Tracking for assertions
	public readonly createdHashes: string[] = []
	public readonly usedHashes: string[] = []
	public readonly invalidatedUsers: number[] = []

	/** Seed a token directly (e.g. an expired or already-used one for reset tests). */
	public addToken(tokenHash: string, data: StoredResetToken): void {
		this.tokens.set(tokenHash, { ...data })
	}

	public clear(): void {
		this.tokens.clear()
		this.createdHashes.length = 0
		this.usedHashes.length = 0
		this.invalidatedUsers.length = 0
	}

	public async create(params: CreatePasswordResetTokenParams): Promise<void> {
		this.createdHashes.push(params.tokenHash)
		this.tokens.set(params.tokenHash, { userId: params.userId, expiresAt: params.expiresAt, usedAt: null })
	}

	public async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null> {
		const token = this.tokens.get(tokenHash)
		return token ? { userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt } : null
	}

	// The interface's optional `tx` is omitted (fewer params is assignable) — standard in-memory double.
	public async markUsed(tokenHash: string): Promise<void> {
		this.usedHashes.push(tokenHash)
		const token = this.tokens.get(tokenHash)
		if (token) {
			token.usedAt = new Date()
		}
	}

	public async invalidateAllForUser(userId: number): Promise<void> {
		this.invalidatedUsers.push(userId)
		for (const [hash, token] of this.tokens.entries()) {
			if (token.userId === userId && token.usedAt === null) {
				this.tokens.delete(hash)
			}
		}
	}

	// Executes the callback inline with a stub tx — the mocked writes ignore it.
	public async runInTransaction<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T> {
		return fn(undefined as unknown as DrizzleTransaction)
	}
}
