import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { permission } from './permission'

export const routeTypeEnum = pgEnum('route_type', ['api', 'frontend'])

export const permissionRoute = pgTable('permission_route', {
	id: serial('id').primaryKey(),
	permissionId: integer('permission_id')
		.notNull()
		.references(() => permission.id, { onDelete: 'restrict' }),
	route: text('route').notNull(),
	routeType: routeTypeEnum('route_type').notNull().default('frontend'),
	createdAt: timestamp('created_at').defaultNow(),
})

export const permissionRouteRelations = relations(permissionRoute, ({ one }) => ({
	permission: one(permission, { fields: [permissionRoute.permissionId], references: [permission.id] }),
}))
