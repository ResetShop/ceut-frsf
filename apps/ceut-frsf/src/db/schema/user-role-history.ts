import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const UserRoleHistoryAction = Object.freeze({
	ASSIGNED: 'assigned',
	REMOVED: 'removed',
} as const)

export type UserRoleHistoryAction = (typeof UserRoleHistoryAction)[keyof typeof UserRoleHistoryAction]

export const userRoleHistory = pgTable(
	'user_role_history',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		roleId: integer('role_id').notNull(),
		action: text('action').notNull(),
		changedBy: integer('changed_by')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		changedAt: timestamp('changed_at').notNull(),
	},
	(table) => [
		index('user_role_history_user_id_idx').on(table.userId),
		index('user_role_history_role_id_idx').on(table.roleId),
	],
)
