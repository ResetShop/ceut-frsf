import type { z } from 'zod'
import type { paginatedResponseSchema, paginationParamsSchema, searchPaginationSchema } from './pagination.schemas'

/**
 * Pagination query parameters type.
 */
export type PaginationParams = z.infer<typeof paginationParamsSchema>

/**
 * Pagination with optional search query parameter.
 */
export type SearchPaginationParams = z.infer<typeof searchPaginationSchema>

/**
 * Generic paginated response type.
 * Use with a specific item type: PaginatedResponse<RoleData>
 */
export type PaginatedResponse<T> = {
	data: T[]
	total: number
	offset: number
	limit: number
}

/**
 * Helper type to infer paginated response from a schema.
 *
 * @example
 * type PaginatedRoles = InferPaginatedResponse<typeof roleDataSchema>;
 */
export type InferPaginatedResponse<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof paginatedResponseSchema<T>>>
