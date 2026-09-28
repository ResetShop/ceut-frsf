import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { BaseRepository } from '../../../helpers/base.repository'
import type { PaginatedResponse } from '../../../interfaces'
import type { CardRepository, ListCardsParams } from './interfaces'

/**
 * Repository for card-related database operations.
 * Provides read access to cards with pagination and search support.
 */
export class DrizzleCardRepository extends BaseRepository implements CardRepository {
	/**
	 * Retrieves all cards with pagination and optional search filtering.
	 *
	 * @param params - Optional list parameters
	 * @param params.offset - Number of records to skip (default: 0)
	 * @param params.limit - Maximum records to return (default: 10)
	 * @param params.search - Optional search term
	 * @returns Paginated response containing cards and metadata
	 */
	public async findAll(params?: ListCardsParams): Promise<PaginatedResponse<unknown>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET

		// TODO: Implement query against actual table
		return {
			data: [],
			total: 0,
			offset,
			limit,
		}
	}

	/**
	 * Retrieves a single card by its ID.
	 *
	 * @param id - The card ID
	 * @returns The card data or null if not found
	 */
	public async findById(id: number): Promise<unknown | null> {
		// TODO: Implement query against actual table
		return null
	}
}
