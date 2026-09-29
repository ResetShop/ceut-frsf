import type { CardData, CreateCardRequest, UpdateCardRequest } from '@contracts/card/card.types'
import type { PaginatedResponse, PaginationParams } from '../../../interfaces'

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Parameters for listing cards with optional search and visibility filtering.
 */
export interface ListCardsParams extends PaginationParams {
	search?: string
	enabled?: boolean
}

// ============================================================================
// Card Mutation Types
// ============================================================================

/**
 * Parameters for creating a card — the validated create request, with contract defaults applied.
 */
export type CreateCardParams = CreateCardRequest

/**
 * Parameters for a partial card update. `undefined` fields are left unchanged; an explicit
 * `pinnedPosition: null` clears the column.
 */
export type UpdateCardParams = UpdateCardRequest

// ============================================================================
// Card Repository & Service Interfaces
// ============================================================================

/**
 * Card repository interface.
 *
 * Reads by id and list reads exclude soft-deleted cards. The unique-field lookups
 * (`findByInternalName`, `findByLegacyId`) include soft-deleted cards, because the database
 * unique constraints span them too. `findPinnedAt` only considers live pinned cards.
 */
export interface CardRepository {
	findById(id: number): Promise<CardData | null>
	findByInternalName(internalName: string): Promise<CardData | null>
	findByLegacyId(legacyId: number): Promise<CardData | null>
	findPinnedAt(pinnedPosition: number): Promise<CardData | null>
	findAll(params?: ListCardsParams): Promise<PaginatedResponse<CardData>>
	create(params: CreateCardParams, actorId: number): Promise<CardData>
	update(id: number, params: UpdateCardParams, actorId: number): Promise<CardData | null>
	softDelete(id: number, actorId: number): Promise<boolean>
}

/**
 * Card service interface.
 */
export interface CardService {
	getCard(id: number): Promise<CardData | null>
	getAllCards(params?: ListCardsParams): Promise<PaginatedResponse<CardData>>
	createCard(params: CreateCardParams, actorId: number): Promise<CardData>
	updateCard(id: number, params: UpdateCardParams, actorId: number): Promise<CardData>
	deleteCard(id: number, actorId: number): Promise<void>
}
