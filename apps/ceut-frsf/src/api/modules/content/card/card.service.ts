import type { PaginatedResponse } from '../../../interfaces'
import type { CardRepository, ListCardsParams } from './interfaces'

interface CardServiceDeps {
	cardRepository: CardRepository
}

/**
 * Service for card operations.
 * Provides read access to cards with pagination and search.
 */
export class CardService {
	private cardRepository: CardRepository

	constructor({ cardRepository }: CardServiceDeps) {
		this.cardRepository = cardRepository
	}

	/**
	 * Retrieves all cards with pagination and optional search filtering.
	 *
	 * @param params - Optional parameters (offset, limit, search)
	 * @returns Paginated response containing cards and metadata
	 */
	public async getAllCards(params?: ListCardsParams): Promise<PaginatedResponse<unknown>> {
		return this.cardRepository.findAll(params)
	}

	/**
	 * Retrieves a single card by its ID.
	 *
	 * @param id - The card ID
	 * @returns The card data or null if not found
	 */
	public async getCard(id: number): Promise<unknown | null> {
		return this.cardRepository.findById(id)
	}
}
