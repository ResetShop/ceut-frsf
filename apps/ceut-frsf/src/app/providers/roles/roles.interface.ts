import { InjectionToken } from '@angular/core'
import type { PaginatedResponse, SearchPaginationParams } from '@contracts/common/pagination.types'
import type {
	AssignPermissionsRequest,
	CreateRoleRequest,
	RoleData,
	RoleWithPermissions,
	UpdateRoleRequest,
} from '@contracts/role/role.types'
import type { Observable } from 'rxjs'

export interface RolesApi {
	getAll(params?: SearchPaginationParams): Observable<PaginatedResponse<RoleData>>
	getAllUnpaginated(): Observable<RoleData[]>
	getByIdWithPermissions(id: number): Observable<RoleWithPermissions>
	create(body: CreateRoleRequest): Observable<RoleData>
	update(id: number, body: UpdateRoleRequest): Observable<RoleData>
	delete(id: number): Observable<void>
	assignPermissions(id: number, body: AssignPermissionsRequest): Observable<void>
}

export const RolesApi = new InjectionToken<RolesApi>('RolesApi')
