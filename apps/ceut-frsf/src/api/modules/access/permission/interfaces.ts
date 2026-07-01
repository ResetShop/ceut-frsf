import type { PaginatedResponse, PaginationParams } from '../../../interfaces'
import type { PermissionData } from '../role/interfaces'

/**
 * Parameters for listing permissions with optional search filtering.
 */
export interface ListPermissionsParams extends PaginationParams {
	search?: string
}

/**
 * Permission repository interface for querying system permissions.
 */
export interface PermissionRepository {
	findAll(params?: ListPermissionsParams): Promise<PaginatedResponse<PermissionData>>
}

/**
 * Permission service interface for listing system permissions.
 */
export interface PermissionService {
	getAllPermissions(params?: ListPermissionsParams): Promise<PaginatedResponse<PermissionData>>
}
