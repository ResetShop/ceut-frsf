import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'

/**
 * A single CEUT portal "tarjeta" (resource card) rendered on the home grid.
 *
 * The copy lives in the translation files (referenced by key); the visual
 * attributes (icon, accent, glow) live here. `category` is Spanish
 * search-matching metadata only — it is never rendered.
 *
 * This shape is intentionally presentation-only and data-source-agnostic so the
 * cards epic can later feed it from the database feed instead of the static
 * list in `portal-cards.data.ts` without changing the grid or card component.
 */
export interface PortalCard {
	id: string
	titleKey: TranslationKey
	textKey: TranslationKey
	footerKey?: TranslationKey
	/** Path under `/icons/cards`, e.g. `biblioteca.png`. */
	icon: string
	/** Intrinsic pixel dimensions of the icon file (required by `NgOptimizedImage`). */
	iconWidth: number
	iconHeight: number
	/** Spanish keyword bucket used only to widen search matching. Not rendered. */
	category: string
	/** Brand hex fill for the colored card treatment; omit for a plain white card. */
	accent?: string
	/** When paired with `accent`, swaps the neutral shadow for a tinted glow. */
	glow?: boolean
}
