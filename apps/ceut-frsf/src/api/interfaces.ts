// ============================================================================
// Shared API Interfaces
// ============================================================================

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
	offset?: number
	limit?: number
}

/**
 * Paginated response wrapper for list endpoints
 */
export interface PaginatedResponse<T> {
	data: T[]
	total: number
	offset: number
	limit: number
}

// ============================================================================
// Error Response Interfaces
// ============================================================================

/**
 * Standardized error response format for all API endpoints.
 *
 * @example
 * // Simple error
 * { error: "User not found" }
 *
 * @example
 * // Error with details
 * { error: "Invalid permission IDs", details: { invalidIds: [999, 1000] } }
 */
export interface ErrorResponse {
	error: string
	details?: Record<string, unknown>
}

/**
 * Success message response for operations that don't return data
 */
export interface SuccessResponse {
	message: string
}
