import { CardType } from '@contracts/card/card.constants'
import { LinkType } from '@contracts/common/link.schemas'
import { createCardRequestSchema, updateCardRequestSchema } from './card.schemas'

describe('createCardRequestSchema', () => {
	it('rejects a missing internalName', () => {
		const result = createCardRequestSchema.safeParse({})

		expect(result.success).toBe(false)
	})

	it('rejects an empty internalName', () => {
		const result = createCardRequestSchema.safeParse({ internalName: '' })

		expect(result.success).toBe(false)
	})

	it('defaults type to icon-corner when omitted', () => {
		const result = createCardRequestSchema.parse({ internalName: 'welcome-card' })

		expect(result.type).toBe(CardType.ICON_CORNER)
	})

	it('rejects a type outside the three known literals', () => {
		const result = createCardRequestSchema.safeParse({ internalName: 'welcome-card', type: 'sidebar' })

		expect(result.success).toBe(false)
	})

	it('accepts a valid imageUrl', () => {
		const result = createCardRequestSchema.safeParse({
			internalName: 'welcome-card',
			imageUrl: 'https://cdn.example.com/icon.png',
		})

		expect(result.success).toBe(true)
	})

	it('rejects a non-URL imageUrl', () => {
		const result = createCardRequestSchema.safeParse({ internalName: 'welcome-card', imageUrl: 'not-a-url' })

		expect(result.success).toBe(false)
	})

	it.each([0, 1, 2])('accepts pinnedPosition %d when isPinned is true', (pinnedPosition) => {
		const result = createCardRequestSchema.safeParse({
			internalName: 'welcome-card',
			isPinned: true,
			pinnedPosition,
		})

		expect(result.success).toBe(true)
	})

	it.each([-1, 3])('rejects pinnedPosition %d', (pinnedPosition) => {
		const result = createCardRequestSchema.safeParse({
			internalName: 'welcome-card',
			isPinned: true,
			pinnedPosition,
		})

		expect(result.success).toBe(false)
	})

	it('rejects isPinned true with no pinnedPosition', () => {
		const result = createCardRequestSchema.safeParse({ internalName: 'welcome-card', isPinned: true })

		expect(result.success).toBe(false)
	})

	it('rejects isPinned false with a pinnedPosition set', () => {
		const result = createCardRequestSchema.safeParse({
			internalName: 'welcome-card',
			isPinned: false,
			pinnedPosition: 0,
		})

		expect(result.success).toBe(false)
	})

	it('defaults footerSeparator, enabled, and isPinned when omitted', () => {
		const result = createCardRequestSchema.parse({ internalName: 'welcome-card' })

		expect(result.footerSeparator).toBe(false)
		expect(result.enabled).toBe(true)
		expect(result.isPinned).toBe(false)
	})

	it('accepts a valid internal link', () => {
		const result = createCardRequestSchema.safeParse({
			internalName: 'welcome-card',
			link: { type: LinkType.INTERNAL, url: '/recursos/becas' },
		})

		expect(result.success).toBe(true)
	})
})

describe('updateCardRequestSchema', () => {
	it('accepts a partial payload with a single field', () => {
		const result = updateCardRequestSchema.safeParse({ title: 'New title' })

		expect(result.success).toBe(true)
	})

	it('still enforces per-field constraints when present', () => {
		const result = updateCardRequestSchema.safeParse({ imageUrl: 'not-a-url' })

		expect(result.success).toBe(false)
	})

	it('rejects isPinned true with no pinnedPosition when present', () => {
		const result = updateCardRequestSchema.safeParse({ isPinned: true })

		expect(result.success).toBe(false)
	})

	it('accepts isPinned and pinnedPosition together', () => {
		const result = updateCardRequestSchema.safeParse({ isPinned: true, pinnedPosition: 1 })

		expect(result.success).toBe(true)
	})
})
