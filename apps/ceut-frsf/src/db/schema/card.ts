import { boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { CardType } from '../../contracts/card/card.constants'
import type { Link } from '../../contracts/common/link.schemas'

export const cardTypeEnum = pgEnum('card_type', [CardType.ICON_CORNER, CardType.HEADER_IMAGE, CardType.FULL_IMAGE])

export const card = pgTable(
	'card',
	{
		id: serial('id').primaryKey(),
		// Sanity's document id — nullable because cards created directly in this system have no legacy origin.
		// Unique so a re-run of the Sanity-to-Postgres migration can upsert idempotently instead of duplicating rows.
		legacyId: integer('legacy_id').unique(),
		internalName: text('internal_name').notNull().unique(),
		title: text('title'),
		type: cardTypeEnum('type').notNull().default(CardType.ICON_CORNER),
		imageUrl: text('image_url'),
		content: text('content'),
		link: jsonb('link').$type<Link>(),
		footerContent: text('footer_content'),
		footerSeparator: boolean('footer_separator').notNull().default(false),
		enabled: boolean('enabled').notNull().default(true),
		isPinned: boolean('is_pinned').notNull().default(false),
		pinnedPosition: integer('pinned_position'),
		position: integer('position').notNull().default(0),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => [
		index('idx_card_position').on(table.position),
		index('idx_card_pinned').on(table.isPinned, table.pinnedPosition),
	],
)
