import { relations } from 'drizzle-orm'
import { index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { permissionRoute } from './permission-route'
import { rolePermission } from './role'

export const permission = pgTable(
	'permission',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull().unique(),
		description: text('description'),
		module: text('module').notNull(),
		resource: text('resource').notNull(),
		action: text('action').notNull(),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => [index('idx_permission_name').on(table.name)],
)

export const permissionRelations = relations(permission, ({ many }) => ({
	roles: many(rolePermission),
	routes: many(permissionRoute),
}))
