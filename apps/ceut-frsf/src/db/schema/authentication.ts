import { relations } from 'drizzle-orm'
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './user'

export const authentication = pgTable('authentication', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	passwordHash: text('password_hash').notNull(),
	mustChangePassword: boolean('must_change_password').default(false).notNull(),
	lastPasswordChangedAt: timestamp('last_password_changed_at').defaultNow(),
	passwordExpiresAt: timestamp('password_expires_at'),
	failedLoginAttempts: integer('failed_login_attempts').default(0),
	lockedUntil: timestamp('locked_until'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})

export const authenticationRelations = relations(authentication, ({ one }) => ({
	user: one(user, { fields: [authentication.userId], references: [user.id] }),
}))
