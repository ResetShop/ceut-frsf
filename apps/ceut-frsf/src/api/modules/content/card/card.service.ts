import type { CardData } from '@contracts/card/card.types'
import type { PaginatedResponse } from '../../../interfaces'
import { CARD_ERRORS, CardConflictError, CardNotFoundError, CardValidationError } from './card.errors'
import type { CardRepository, CreateCardParams, ListCardsParams, UpdateCardParams } from './interfaces'

interface CardServiceDeps {
	cardRepository: CardRepository
}

/**
 * Service for card management operations.
 * Enforces unique `internalName` / `legacyId` values and the pinned-position invariant.
 * Hiding a card is an update of `enabled`; deleting is a soft-delete.
 */
export class CardService {
	private cardRepository: CardRepository

	constructor({ cardRepository }: CardServiceDeps) {
		this.cardRepository = cardRepository
	}

	/**
	 * Retrieves a live card by its primary key.
	 *
	 * @param id - The card's primary key
	 * @returns The card data if found and not deleted, null otherwise
	 */
	public async getCard(id: number): Promise<CardData | null> {
		return this.cardRepository.findById(id)
	}

	/**
	 * Retrieves live cards with pagination and optional search / visibility filtering.
	 *
	 * @param params - Optional parameters (offset, limit, search, enabled)
	 * @returns Paginated response containing cards and metadata
	 */
	public async getAllCards(params?: ListCardsParams): Promise<PaginatedResponse<CardData>> {
		return this.cardRepository.findAll(params)
	}

	/**
	 * Creates a card after checking that its unique fields are free.
	 *
	 * @param params - The validated card creation parameters
	 * @param actorId - ID of the user performing the action
	 * @returns The newly created card data
	 * @throws CardConflictError if the internal name or legacy id is already taken (including by a deleted card)
	 */
	public async createCard(params: CreateCardParams, actorId: number): Promise<CardData> {
		await this.assertUniqueFields(params)
		return this.cardRepository.create(params, actorId)
	}

	/**
	 * Applies a partial update to a live card.
	 * Sending `isPinned: false` unpins the card and clears its `pinnedPosition`.
	 *
	 * @param id - The card's primary key
	 * @param params - Fields to update
	 * @param actorId - ID of the user performing the action
	 * @returns The updated card data
	 * @throws CardNotFoundError if the card is not found
	 * @throws CardConflictError if a unique field collides with another card
	 * @throws CardValidationError if the merged pinning state is inconsistent
	 */
	public async updateCard(id: number, params: UpdateCardParams, actorId: number): Promise<CardData> {
		const existing = await this.cardRepository.findById(id)
		if (!existing) {
			throw new CardNotFoundError(id)
		}

		await this.assertUniqueFields(params, existing)
		const patch = this.resolvePinning(existing, params)

		const updated = await this.cardRepository.update(id, patch, actorId)
		if (!updated) {
			throw new CardNotFoundError(id)
		}

		return updated
	}

	/**
	 * Soft-deletes a live card; the repository records the history row.
	 *
	 * @param id - The card's primary key
	 * @param actorId - ID of the user performing the action
	 * @throws CardNotFoundError if the card is not found or already deleted
	 */
	public async deleteCard(id: number, actorId: number): Promise<void> {
		const deleted = await this.cardRepository.softDelete(id, actorId)
		if (!deleted) {
			throw new CardNotFoundError(id)
		}
	}

	/**
	 * Rejects an `internalName` or `legacyId` already held by a different card.
	 * Values unchanged from `existing` are skipped.
	 */
	private async assertUniqueFields(
		params: { internalName?: string; legacyId?: number | null },
		existing?: CardData,
	): Promise<void> {
		if (params.internalName !== undefined && params.internalName !== existing?.internalName) {
			const holder = await this.cardRepository.findByInternalName(params.internalName)
			if (holder) {
				throw CardConflictError.internalName(params.internalName)
			}
		}

		if (typeof params.legacyId === 'number' && params.legacyId !== existing?.legacyId) {
			const holder = await this.cardRepository.findByLegacyId(params.legacyId)
			if (holder) {
				throw CardConflictError.legacyId(params.legacyId)
			}
		}
	}

	/**
	 * Validates the pinning pair against the merged (stored + patch) state and returns the
	 * patch to persist. Unpinning clears the position so the stored pair stays consistent.
	 */
	private resolvePinning(existing: CardData, params: UpdateCardParams): UpdateCardParams {
		if (params.isPinned === false) {
			return { ...params, pinnedPosition: null }
		}

		const isPinned = params.isPinned ?? existing.isPinned
		const pinnedPosition = params.pinnedPosition === undefined ? existing.pinnedPosition : params.pinnedPosition
		if (isPinned !== (pinnedPosition !== null)) {
			throw new CardValidationError(CARD_ERRORS.INVALID_PINNING)
		}

		return params
	}
}
