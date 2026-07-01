import type { PaginatedResponse } from '../../../interfaces'
import type { PermissionData } from '../role/interfaces'
import type { ListPermissionsParams, PermissionRepository } from './interfaces'

interface PermissionServiceDeps {
	permissionRepository: PermissionRepository
}

/**
 * Service for permission listing operations.
 * Provides read-only access to system permissions with pagination and search.
 */
export class PermissionService {
	private permissionRepository: PermissionRepository

	constructor({ permissionRepository }: PermissionServiceDeps) {
		this.permissionRepository = permissionRepository
	}

	/**
	 * Retrieves all system permissions with pagination and optional search filtering.
	 *
	 * @param params - Optional parameters (offset, limit, search)
	 * @returns Paginated response containing permissions and metadata
	 */
	public async getAllPermissions(params?: ListPermissionsParams): Promise<PaginatedResponse<PermissionData>> {
		return this.permissionRepository.findAll(params)
	}
}
