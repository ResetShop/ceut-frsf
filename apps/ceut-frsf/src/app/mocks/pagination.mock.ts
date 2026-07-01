import type { PaginatedResponse } from '@contracts/common/pagination.types'

export function createPaginatedResponse<T>(data: T[], total?: number): PaginatedResponse<T> {
	return { data, total: total ?? data.length, offset: 0, limit: 10 }
}
