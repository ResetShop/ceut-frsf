import { relations } from 'drizzle-orm'
import { foreignKey, index, integer, pgEnum, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { UserStatus } from '../../contracts/user/user.constants'
import { role } from './role'

export const userStatusEnum = pgEnum('user_status', [UserStatus.ACTIVE, UserStatus.DISABLED, UserStatus.DELETED])

export const user = pgTable(
	'user',
	{
		id: serial('id').primaryKey(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		email: text('email').notNull().unique(),
		status: userStatusEnum('status').notNull().default(UserStatus.ACTIVE),
		statusChangedAt: timestamp('status_changed_at'),
		// Standalone FK avoids circular type inference from inline .references()
		// on a self-referencing column (breaks Drizzle relational query types).
		statusChangedBy: integer('status_changed_by'),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => ({
		statusIdx: index('user_status_idx').on(table.status),
		statusChangedByFk: foreignKey({
			columns: [table.statusChangedBy],
			foreignColumns: [table.id],
		}).onDelete('set null'),
	}),
)

export const userRole = pgTable(
	'user_role',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		roleId: integer('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		userRoleUnique: unique().on(table.userId, table.roleId),
		userIdIdx: index('user_role_user_id_idx').on(table.userId),
	}),
)

export const userRelations = relations(user, ({ many }) => ({
	roles: many(userRole),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
	user: one(user, { fields: [userRole.userId], references: [user.id] }),
	role: one(role, { fields: [userRole.roleId], references: [role.id] }),
}))
