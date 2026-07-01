import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const RolePermissionHistoryAction = Object.freeze({
	ASSIGNED: 'assigned',
	REMOVED: 'removed',
} as const)

export type RolePermissionHistoryAction = (typeof RolePermissionHistoryAction)[keyof typeof RolePermissionHistoryAction]

export const rolePermissionHistory = pgTable(
	'role_permission_history',
	{
		id: serial('id').primaryKey(),
		roleId: integer('role_id').notNull(),
		permissionId: integer('permission_id').notNull(),
		action: text('action').notNull(),
		changedBy: integer('changed_by')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		changedAt: timestamp('changed_at').notNull(),
	},
	(table) => [index('role_permission_history_role_id_idx').on(table.roleId)],
)
