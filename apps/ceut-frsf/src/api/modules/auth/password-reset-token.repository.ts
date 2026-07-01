import { passwordResetToken } from '@schema/password-reset-token'
import { and, eq, isNull } from 'drizzle-orm'
import { BaseRepository } from '../../helpers/base.repository'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import {
	type CreatePasswordResetTokenParams,
	type PasswordResetTokenRepository as IPasswordResetTokenRepository,
	type PasswordResetTokenData,
} from './interfaces'

/**
 * Drizzle-backed repository for self-service password-reset tokens. Only token hashes are
 * persisted; `runInTransaction` is inherited from BaseRepository.
 */
export class DrizzlePasswordResetTokenRepository extends BaseRepository implements IPasswordResetTokenRepository {
	public async create(params: CreatePasswordResetTokenParams): Promise<void> {
		await this.db.insert(passwordResetToken).values({
			userId: params.userId,
			tokenHash: params.tokenHash,
			expiresAt: params.expiresAt,
		})
	}

	public async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null> {
		const result = await this.db
			.select({
				userId: passwordResetToken.userId,
				expiresAt: passwordResetToken.expiresAt,
				usedAt: passwordResetToken.usedAt,
			})
			.from(passwordResetToken)
			.where(eq(passwordResetToken.tokenHash, tokenHash))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	public async markUsed(tokenHash: string, tx?: DrizzleTransaction): Promise<void> {
		const executor = tx ?? this.db
		await executor
			.update(passwordResetToken)
			.set({ usedAt: new Date() })
			.where(eq(passwordResetToken.tokenHash, tokenHash))
	}

	/**
	 * Deletes a user's outstanding (unused) reset tokens — called when issuing a new one so only the
	 * latest link is valid. Used tokens are retained (they are already inert via `usedAt`).
	 */
	public async invalidateAllForUser(userId: number): Promise<void> {
		await this.db
			.delete(passwordResetToken)
			.where(and(eq(passwordResetToken.userId, userId), isNull(passwordResetToken.usedAt)))
	}
}
