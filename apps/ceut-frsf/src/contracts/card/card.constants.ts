/**
 * Card layout values — single source of truth for all layers.
 *
 * Imported by:
 * - DB schema (Drizzle pgEnum)
 * - API contracts (Zod schemas)
 *
 * This file has zero dependencies so it can be safely imported anywhere.
 */
export const CardType = Object.freeze({
	ICON_CORNER: 'icon-corner',
	HEADER_IMAGE: 'header-image',
	FULL_IMAGE: 'full-image',
} as const)

export type CardType = (typeof CardType)[keyof typeof CardType]

/** Field length limits specific to the `card` entity — kept local rather than in the shared `QUERY_DEFAULTS`. */
export const CARD_FIELD_LIMITS = Object.freeze({
	INTERNAL_NAME_MAX_LENGTH: 100,
	TITLE_MAX_LENGTH: 200,
	CONTENT_MAX_LENGTH: 5000,
	FOOTER_CONTENT_MAX_LENGTH: 300,
} as const)
