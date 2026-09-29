import { CardType } from '@contracts/card/card.constants'
import type { CardData } from '@contracts/card/card.types'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CARD_ERRORS, CardConflictError, CardNotFoundError, CardValidationError } from './card.errors'
import { InMemoryCardRepository } from './card.repository.mock'
import { CardService } from './card.service'
import type { CreateCardParams } from './interfaces'

describe('CardService', () => {
	let cardService: CardService
	let mockCardRepo: InMemoryCardRepository
	const actorId = 7

	function buildCard(overrides: Partial<CardData> = {}): CardData {
		return {
			id: 1,
			legacyId: null,
			internalName: 'welcome-card',
			title: 'Welcome',
			type: CardType.ICON_CORNER,
			imageUrl: null,
			content: null,
			link: null,
			footerContent: null,
			footerSeparator: false,
			enabled: true,
			isPinned: false,
			pinnedPosition: null,
			position: 0,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		}
	}

	function buildCreateParams(overrides: Partial<CreateCardParams> = {}): CreateCardParams {
		return {
			internalName: 'new-card',
			type: CardType.ICON_CORNER,
			footerSeparator: false,
			enabled: true,
			isPinned: false,
			...overrides,
		}
	}

	beforeEach(() => {
		clearAllMocks()
		mockCardRepo = new InMemoryCardRepository()
		cardService = new CardService({ cardRepository: mockCardRepo })
	})

	afterEach(() => {
		mockCardRepo.clear()
	})

	describe('getCard', () => {
		it('returns the card when found', async () => {
			const card = buildCard()
			mockCardRepo.addCard(card)

			expect(await cardService.getCard(card.id)).toEqual(card)
		})

		it('returns null when the card does not exist', async () => {
			expect(await cardService.getCard(999)).toBeNull()
		})

		it('returns null when the card is soft-deleted', async () => {
			mockCardRepo.addCard(buildCard({ deletedAt: new Date() }))

			expect(await cardService.getCard(1)).toBeNull()
		})
	})

	describe('getAllCards', () => {
		beforeEach(() => {
			mockCardRepo.addCard(buildCard({ id: 1, internalName: 'alpha', title: 'Becas', position: 2 }))
			mockCardRepo.addCard(buildCard({ id: 2, internalName: 'beta', title: 'Horarios', position: 1, enabled: false }))
			mockCardRepo.addCard(buildCard({ id: 3, internalName: 'gamma', title: null, deletedAt: new Date() }))
		})

		it('lists live cards ordered by position and excludes deleted ones', async () => {
			const result = await cardService.getAllCards()

			expect(result.data.map((c) => c.id)).toEqual([2, 1])
			expect(result.total).toBe(2)
		})

		it('filters by enabled', async () => {
			const result = await cardService.getAllCards({ enabled: false })

			expect(result.data.map((c) => c.id)).toEqual([2])
		})

		it('searches internal name and title case-insensitively', async () => {
			const result = await cardService.getAllCards({ search: 'BECAS' })

			expect(result.data.map((c) => c.id)).toEqual([1])
		})

		it('applies offset and limit', async () => {
			const result = await cardService.getAllCards({ offset: 1, limit: 1 })

			expect(result).toMatchObject({ offset: 1, limit: 1, total: 2 })
			expect(result.data.map((c) => c.id)).toEqual([1])
		})
	})

	describe('createCard', () => {
		it('creates a card with the given fields', async () => {
			const result = await cardService.createCard(buildCreateParams({ title: 'Hello' }), actorId)

			expect(result).toMatchObject({ internalName: 'new-card', title: 'Hello', enabled: true, deletedAt: null })
		})

		it('stores the requested position', async () => {
			const result = await cardService.createCard(buildCreateParams({ position: 4 }), actorId)

			expect(result.position).toBe(4)
		})

		it('rejects a duplicate internalName', async () => {
			mockCardRepo.addCard(buildCard({ internalName: 'new-card' }))

			const creation = cardService.createCard(buildCreateParams(), actorId)

			await expect(creation).rejects.toThrow(CardConflictError)
			await expect(creation).rejects.toThrow(CARD_ERRORS.INTERNAL_NAME_EXISTS)
		})

		it('rejects an internalName still held by a soft-deleted card', async () => {
			mockCardRepo.addCard(buildCard({ internalName: 'new-card', deletedAt: new Date() }))

			await expect(cardService.createCard(buildCreateParams(), actorId)).rejects.toThrow(
				CARD_ERRORS.INTERNAL_NAME_EXISTS,
			)
		})

		it('rejects a duplicate legacyId', async () => {
			mockCardRepo.addCard(buildCard({ internalName: 'other', legacyId: 42 }))

			await expect(cardService.createCard(buildCreateParams({ legacyId: 42 }), actorId)).rejects.toThrow(
				CARD_ERRORS.LEGACY_ID_EXISTS,
			)
		})

		it('rejects pinning into a slot held by another live card', async () => {
			mockCardRepo.addCard(buildCard({ internalName: 'holder', isPinned: true, pinnedPosition: 0 }))

			await expect(
				cardService.createCard(buildCreateParams({ isPinned: true, pinnedPosition: 0 }), actorId),
			).rejects.toThrow(CARD_ERRORS.PINNED_SLOT_TAKEN)
		})

		it('allows pinning into a slot freed by a deleted card', async () => {
			mockCardRepo.addCard(
				buildCard({ internalName: 'gone', isPinned: true, pinnedPosition: 0, deletedAt: new Date() }),
			)

			const result = await cardService.createCard(buildCreateParams({ isPinned: true, pinnedPosition: 0 }), actorId)

			expect(result).toMatchObject({ isPinned: true, pinnedPosition: 0 })
		})
	})

	describe('updateCard', () => {
		it('updates the provided fields and leaves the rest unchanged', async () => {
			mockCardRepo.addCard(buildCard())

			const result = await cardService.updateCard(1, { title: 'Changed' }, actorId)

			expect(result).toMatchObject({ title: 'Changed', internalName: 'welcome-card' })
		})

		it('clears nullable fields sent as null and keeps omitted ones', async () => {
			mockCardRepo.addCard(
				buildCard({ legacyId: 42, content: 'Body', link: { type: 'internal', url: '/becas' }, footerContent: 'Pie' }),
			)

			const result = await cardService.updateCard(1, { title: null, legacyId: null, link: null }, actorId)

			expect(result).toMatchObject({ title: null, legacyId: null, link: null, content: 'Body', footerContent: 'Pie' })
		})

		it('hides a card by updating enabled without deleting it', async () => {
			mockCardRepo.addCard(buildCard())

			const result = await cardService.updateCard(1, { enabled: false }, actorId)

			expect(result.enabled).toBe(false)
			expect(await cardService.getCard(1)).toMatchObject({ enabled: false, deletedAt: null })
		})

		it('throws not found for a missing card', async () => {
			await expect(cardService.updateCard(999, { title: 'x' }, actorId)).rejects.toThrow(CardNotFoundError)
		})

		it('throws not found for a soft-deleted card', async () => {
			mockCardRepo.addCard(buildCard({ deletedAt: new Date() }))

			await expect(cardService.updateCard(1, { title: 'x' }, actorId)).rejects.toThrow(CARD_ERRORS.NOT_FOUND)
		})

		it('rejects renaming to an internalName held by another card', async () => {
			mockCardRepo.addCard(buildCard())
			mockCardRepo.addCard(buildCard({ id: 2, internalName: 'taken' }))

			await expect(cardService.updateCard(1, { internalName: 'taken' }, actorId)).rejects.toThrow(
				CARD_ERRORS.INTERNAL_NAME_EXISTS,
			)
		})

		it('accepts resending the card own internalName', async () => {
			mockCardRepo.addCard(buildCard())

			const result = await cardService.updateCard(1, { internalName: 'welcome-card' }, actorId)

			expect(result.internalName).toBe('welcome-card')
		})

		it('rejects a legacyId held by another card', async () => {
			mockCardRepo.addCard(buildCard())
			mockCardRepo.addCard(buildCard({ id: 2, internalName: 'other', legacyId: 42 }))

			await expect(cardService.updateCard(1, { legacyId: 42 }, actorId)).rejects.toThrow(CARD_ERRORS.LEGACY_ID_EXISTS)
		})

		it('rejects a lone pinnedPosition on an unpinned card', async () => {
			mockCardRepo.addCard(buildCard())

			await expect(cardService.updateCard(1, { pinnedPosition: 1 }, actorId)).rejects.toThrow(CardValidationError)
		})

		it('rejects clearing pinnedPosition on a pinned card', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 0 }))

			await expect(cardService.updateCard(1, { pinnedPosition: null }, actorId)).rejects.toThrow(
				CARD_ERRORS.INVALID_PINNING,
			)
		})

		it('repositions an already pinned card with a lone pinnedPosition', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 0 }))

			const result = await cardService.updateCard(1, { pinnedPosition: 2 }, actorId)

			expect(result).toMatchObject({ isPinned: true, pinnedPosition: 2 })
		})

		it('clears pinnedPosition when unpinning without sending a position', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 1 }))

			const result = await cardService.updateCard(1, { isPinned: false }, actorId)

			expect(result).toMatchObject({ isPinned: false, pinnedPosition: null })
		})

		it('rejects moving a card into a slot held by another card', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 0 }))
			mockCardRepo.addCard(buildCard({ id: 2, internalName: 'other', isPinned: true, pinnedPosition: 1 }))

			await expect(cardService.updateCard(1, { pinnedPosition: 1 }, actorId)).rejects.toThrow(CardConflictError)
		})

		it('keeps an already pinned card in its own slot when isPinned true is resent alone', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 2 }))

			const result = await cardService.updateCard(1, { isPinned: true }, actorId)

			expect(result).toMatchObject({ isPinned: true, pinnedPosition: 2 })
		})

		it('rejects isPinned true alone on an unpinned card', async () => {
			mockCardRepo.addCard(buildCard())

			await expect(cardService.updateCard(1, { isPinned: true }, actorId)).rejects.toThrow(CardValidationError)
		})

		it('does not check the pinned slot when the update does not touch pinning', async () => {
			mockCardRepo.addCard(buildCard({ isPinned: true, pinnedPosition: 0 }))
			mockCardRepo.addCard(buildCard({ id: 2, internalName: 'twin', isPinned: true, pinnedPosition: 0 }))

			const result = await cardService.updateCard(2, { title: 'Renamed' }, actorId)

			expect(result.title).toBe('Renamed')
		})

		it('pins an unpinned card when both fields are sent', async () => {
			mockCardRepo.addCard(buildCard())

			const result = await cardService.updateCard(1, { isPinned: true, pinnedPosition: 0 }, actorId)

			expect(result).toMatchObject({ isPinned: true, pinnedPosition: 0 })
		})
	})

	describe('deleteCard', () => {
		it('soft-deletes the card so it is no longer readable', async () => {
			mockCardRepo.addCard(buildCard())

			await cardService.deleteCard(1, actorId)

			expect(await cardService.getCard(1)).toBeNull()
			expect(await mockCardRepo.findByInternalName('welcome-card')).toMatchObject({ deletedAt: expect.any(Date) })
		})

		it('throws not found for a missing card', async () => {
			await expect(cardService.deleteCard(999, actorId)).rejects.toThrow(CARD_ERRORS.NOT_FOUND)
		})

		it('throws not found when the card is already deleted', async () => {
			mockCardRepo.addCard(buildCard())
			await cardService.deleteCard(1, actorId)

			await expect(cardService.deleteCard(1, actorId)).rejects.toThrow(CARD_ERRORS.NOT_FOUND)
		})
	})
})
