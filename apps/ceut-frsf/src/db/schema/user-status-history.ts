import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const userStatusHistory = pgTable(
	'user_status_history',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		status: text('status').notNull(),
		changedBy: integer('changed_by')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		changedAt: timestamp('changed_at').notNull(),
	},
	(table) => [index('user_status_history_user_id_idx').on(table.userId)],
)
