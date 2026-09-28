import type { PaginatedResponse, PaginationParams } from '../../../interfaces'

/**
 * Parameters for listing cards with optional search filtering.
 */
export interface ListCardsParams extends PaginationParams {
	search?: string
}

/**
 * Card repository interface for querying cards.
 */
export interface CardRepository {
	findAll(params?: ListCardsParams): Promise<PaginatedResponse<unknown>>
	findById(id: number): Promise<unknown | null>
}

/**
 * Card service interface for card operations.
 */
export interface CardService {
	getAllCards(params?: ListCardsParams): Promise<PaginatedResponse<unknown>>
	getCard(id: number): Promise<unknown | null>
}
