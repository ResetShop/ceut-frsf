import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

/**
 * Self-service password-reset tokens. Only the SHA-256 hash of the token is stored — the raw
 * token lives solely in the emailed reset link. Tokens are single-use (`usedAt`) and time-limited
 * (`expiresAt`); see PASSWORD_RESET_TOKEN_EXPIRY.
 */
export const passwordResetToken = pgTable(
	'password_reset_token',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: timestamp('expires_at').notNull(),
		usedAt: timestamp('used_at'),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => [
		index('password_reset_token_user_id_idx').on(table.userId),
		index('password_reset_token_expires_at_idx').on(table.expiresAt),
	],
)
