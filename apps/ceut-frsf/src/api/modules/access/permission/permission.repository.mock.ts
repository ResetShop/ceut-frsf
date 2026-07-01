import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type { PaginatedResponse } from '../../../interfaces'
import type { PermissionData } from '../role/interfaces'
import type { ListPermissionsParams, PermissionRepository } from './interfaces'

export class InMemoryPermissionRepository implements PermissionRepository {
	private permissions: PermissionData[] = []

	/**
	 * Add a permission to the mock repository for testing.
	 */
	public addPermission(permission: PermissionData): void {
		this.permissions.push(permission)
	}

	/**
	 * Clear all data from the mock repository.
	 */
	public clear(): void {
		this.permissions = []
	}

	public async findAll(params?: ListPermissionsParams): Promise<PaginatedResponse<PermissionData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET

		let filtered = this.permissions

		if (params?.search && params.search.trim().length > 0) {
			const searchLower = params.search.trim().toLowerCase()
			filtered = filtered.filter(
				(p) =>
					p.name.toLowerCase().includes(searchLower) ||
					(p.description?.toLowerCase().includes(searchLower) ?? false) ||
					p.resource.toLowerCase().includes(searchLower) ||
					p.action.toLowerCase().includes(searchLower),
			)
		}

		const data = filtered.slice(offset, offset + limit)

		return {
			data,
			total: filtered.length,
			offset,
			limit,
		}
	}
}
