import { relations } from 'drizzle-orm'
import { boolean, index, integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { permission } from './permission'
import { userRole } from './user'

export const role = pgTable(
	'role',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull().unique(),
		code: text('code').notNull().unique(),
		description: text('description'),
		removable: boolean('removable').notNull().default(true),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => [index('idx_role_code').on(table.code)],
)

export const rolePermission = pgTable(
	'role_permission',
	{
		id: serial('id').primaryKey(),
		roleId: integer('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' }),
		permissionId: integer('permission_id')
			.notNull()
			.references(() => permission.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		rolePermissionUnique: unique().on(table.roleId, table.permissionId),
	}),
)

export const roleRelations = relations(role, ({ many }) => ({
	permissions: many(rolePermission),
	users: many(userRole),
}))

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
	role: one(role, { fields: [rolePermission.roleId], references: [role.id] }),
	permission: one(permission, { fields: [rolePermission.permissionId], references: [permission.id] }),
}))
