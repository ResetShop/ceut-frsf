import { z } from 'zod'
import { QUERY_DEFAULTS } from './query.constants'

/** Pagination query parameters schema. */
export const paginationParamsSchema = z.object({
	offset: z.coerce.number().int().min(QUERY_DEFAULTS.OFFSET).optional(),
	limit: z.coerce.number().int().min(QUERY_DEFAULTS.MIN_LIMIT).max(QUERY_DEFAULTS.MAX_LIMIT).optional(),
})

/**
 * Pagination with optional search query parameter.
 * Used by list endpoints that support text search.
 */
export const searchPaginationSchema = paginationParamsSchema.extend({
	search: z.string().trim().min(QUERY_DEFAULTS.SEARCH_MIN_LENGTH).max(QUERY_DEFAULTS.SEARCH_MAX_LENGTH).optional(),
})

/**
 * Factory function to create a paginated response schema for any item type.
 *
 * @param itemSchema - Zod schema for the items in the data array
 * @returns Paginated response schema with data, total, offset, and limit
 *
 * @example
 * const paginatedRolesSchema = paginatedResponseSchema(roleDataSchema);
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
	return z.object({
		data: z.array(itemSchema),
		total: z.number(),
		offset: z.number(),
		limit: z.number(),
	})
}
