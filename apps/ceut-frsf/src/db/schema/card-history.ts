import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import type { Link } from '../../contracts/common/link.schemas'
import { user } from './user'

export const CardHistoryAction = Object.freeze({
	CREATED: 'created',
	UPDATED: 'updated',
	DELETED: 'deleted',
} as const)

export type CardHistoryAction = (typeof CardHistoryAction)[keyof typeof CardHistoryAction]

export const cardHistory = pgTable(
	'card_history',
	{
		id: serial('id').primaryKey(),
		cardId: integer('card_id').notNull(),
		action: text('action').notNull(),
		internalName: text('internal_name').notNull(),
		title: text('title'),
		// Stored as plain text, not `cardTypeEnum` — history rows are immutable snapshots, not
		// subject to the live row's enum-membership guarantee.
		type: text('type').notNull(),
		imageUrl: text('image_url'),
		content: text('content'),
		link: jsonb('link').$type<Link>(),
		footerContent: text('footer_content'),
		footerSeparator: boolean('footer_separator').notNull(),
		enabled: boolean('enabled').notNull(),
		isPinned: boolean('is_pinned').notNull(),
		pinnedPosition: integer('pinned_position'),
		position: integer('position').notNull(),
		changedBy: integer('changed_by')
			.notNull()
			.references(() => user.id, { onDelete: 'restrict' }),
		changedAt: timestamp('changed_at').notNull(),
	},
	(table) => [index('card_history_card_id_idx').on(table.cardId)],
)
