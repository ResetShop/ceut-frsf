import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { permission } from '@schema/permission'
import { type SQL, count, ilike, or } from 'drizzle-orm'
import { BaseRepository } from '../../../helpers/base.repository'
import type { PaginatedResponse } from '../../../interfaces'
import type { PermissionData } from '../role/interfaces'
import type { ListPermissionsParams, PermissionRepository } from './interfaces'

/**
 * Repository for permission-related database operations.
 * Provides read-only access to system permissions with pagination and search support.
 */
export class DrizzlePermissionRepository extends BaseRepository implements PermissionRepository {
	/**
	 * Retrieves all permissions with pagination and optional search filtering.
	 * Search is case-insensitive and matches against name, description, module, resource, or action.
	 *
	 * @param params - Optional list parameters
	 * @param params.offset - Number of records to skip (default: 0)
	 * @param params.limit - Maximum records to return (default: 10)
	 * @param params.search - Optional search term
	 * @returns Paginated response containing permissions and metadata
	 */
	public async findAll(params?: ListPermissionsParams): Promise<PaginatedResponse<PermissionData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET
		const searchCondition = this.buildSearchCondition(params?.search)

		const [data, totalResult] = await Promise.all([
			this.db
				.select({
					id: permission.id,
					name: permission.name,
					description: permission.description,
					module: permission.module,
					resource: permission.resource,
					action: permission.action,
				})
				.from(permission)
				.where(searchCondition)
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(permission).where(searchCondition),
		])

		return {
			data,
			total: totalResult[0].count,
			offset,
			limit,
		}
	}

	/**
	 * Builds a case-insensitive search condition for filtering permissions
	 * by name, description, module, resource, or action.
	 * SQL wildcard characters (%, _) are escaped to be treated as literals.
	 *
	 * @param search - The search term to filter by
	 * @returns A SQL condition or undefined if no search term provided
	 */
	private buildSearchCondition(search?: string): SQL | undefined {
		if (!search || search.trim().length === 0) {
			return undefined
		}

		const escaped = search.trim().replace(/[%_]/g, '\\$&')
		const pattern = `%${escaped}%`
		return or(
			ilike(permission.name, pattern),
			ilike(permission.description, pattern),
			ilike(permission.module, pattern),
			ilike(permission.resource, pattern),
			ilike(permission.action, pattern),
		)
	}
}
