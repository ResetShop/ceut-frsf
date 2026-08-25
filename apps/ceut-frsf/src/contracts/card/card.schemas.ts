import { linkSchema } from '@contracts/common/link.schemas'
import { z } from 'zod'
import { CARD_FIELD_LIMITS, CardType } from './card.constants'

// ============================================================================
// Card Schemas
// ============================================================================

/**
 * Card data schema returned from the database.
 */
export const cardDataSchema = z.object({
	id: z.number(),
	legacyId: z.number().int().positive().nullable(),
	internalName: z.string(),
	title: z.string().nullable(),
	type: z.enum([CardType.ICON_CORNER, CardType.HEADER_IMAGE, CardType.FULL_IMAGE]),
	imageUrl: z.url().nullable(),
	content: z.string().nullable(),
	link: linkSchema.nullable(),
	footerContent: z.string().nullable(),
	footerSeparator: z.boolean(),
	enabled: z.boolean(),
	isPinned: z.boolean(),
	pinnedPosition: z.number().int().min(0).max(2).nullable(),
	position: z.number().int(),
	deletedAt: z.coerce.date().nullable(),
	createdAt: z.coerce.date().nullable(),
	updatedAt: z.coerce.date().nullable(),
})

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * A pinned card must carry a 0–2 `pinnedPosition`; an unpinned card must not — mirrors the
 * "up to 3 fixed cards" invariant from the source data, enforced here since the DB column pair
 * has no `CHECK` constraint (this codebase pushes cross-field invariants to the contract layer).
 */
function pinnedPositionMatchesIsPinned(data: { isPinned?: boolean; pinnedPosition?: number | null }): boolean {
	const isPinned = data.isPinned ?? false
	const pinnedPosition = data.pinnedPosition ?? null

	if (isPinned) return pinnedPosition !== null
	return pinnedPosition === null
}

const PINNED_POSITION_REFINE_MESSAGE = 'pinnedPosition must be set (0-2) when isPinned is true, and unset otherwise'

export const createCardRequestSchema = z
	.object({
		legacyId: z.number().int().positive().optional(),
		internalName: z.string().min(1).max(CARD_FIELD_LIMITS.INTERNAL_NAME_MAX_LENGTH),
		title: z.string().max(CARD_FIELD_LIMITS.TITLE_MAX_LENGTH).optional(),
		type: z.enum([CardType.ICON_CORNER, CardType.HEADER_IMAGE, CardType.FULL_IMAGE]).default(CardType.ICON_CORNER),
		imageUrl: z.url().optional(),
		content: z.string().max(CARD_FIELD_LIMITS.CONTENT_MAX_LENGTH).optional(),
		link: linkSchema.optional(),
		footerContent: z.string().max(CARD_FIELD_LIMITS.FOOTER_CONTENT_MAX_LENGTH).optional(),
		footerSeparator: z.boolean().default(false),
		enabled: z.boolean().default(true),
		isPinned: z.boolean().default(false),
		pinnedPosition: z.number().int().min(0).max(2).nullable().optional(),
	})
	.refine(pinnedPositionMatchesIsPinned, { message: PINNED_POSITION_REFINE_MESSAGE, path: ['pinnedPosition'] })

export const updateCardRequestSchema = z
	.object({
		legacyId: z.number().int().positive().optional(),
		internalName: z.string().min(1).max(CARD_FIELD_LIMITS.INTERNAL_NAME_MAX_LENGTH).optional(),
		title: z.string().max(CARD_FIELD_LIMITS.TITLE_MAX_LENGTH).optional(),
		type: z.enum([CardType.ICON_CORNER, CardType.HEADER_IMAGE, CardType.FULL_IMAGE]).optional(),
		imageUrl: z.url().optional(),
		content: z.string().max(CARD_FIELD_LIMITS.CONTENT_MAX_LENGTH).optional(),
		link: linkSchema.optional(),
		footerContent: z.string().max(CARD_FIELD_LIMITS.FOOTER_CONTENT_MAX_LENGTH).optional(),
		footerSeparator: z.boolean().optional(),
		enabled: z.boolean().optional(),
		isPinned: z.boolean().optional(),
		pinnedPosition: z.number().int().min(0).max(2).nullable().optional(),
	})
	.refine(
		(data) => (data.isPinned === undefined && data.pinnedPosition === undefined) || pinnedPositionMatchesIsPinned(data),
		{
			message: PINNED_POSITION_REFINE_MESSAGE,
			path: ['pinnedPosition'],
		},
	)
