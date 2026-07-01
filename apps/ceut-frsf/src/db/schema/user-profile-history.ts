import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const userProfileHistory = pgTable(
	'user_profile_history',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		changedBy: integer('changed_by')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		changedAt: timestamp('changed_at').notNull(),
	},
	(table) => [index('user_profile_history_user_id_idx').on(table.userId)],
)
