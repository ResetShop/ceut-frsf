import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import type { PaginatedResponse, SearchPaginationParams } from '@contracts/common/pagination.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type {
	AssignPermissionsRequest,
	CreateRoleRequest,
	PermissionData,
	RoleData,
	RoleWithPermissions,
	UpdateRoleRequest,
} from '@contracts/role/role.types'
import { forkJoin, map, type Observable } from 'rxjs'

import type { RolesApi } from './roles.interface'

@Injectable({ providedIn: 'root' })
export class HttpRolesApi implements RolesApi {
	private readonly http = inject(HttpClient)

	public getAll({
		offset = QUERY_DEFAULTS.OFFSET,
		limit = QUERY_DEFAULTS.LIMIT,
		search,
	}: SearchPaginationParams = {}): Observable<PaginatedResponse<RoleData>> {
		const params: Record<string, string | number> = { offset, limit }
		if (search) {
			params['search'] = search
		}
		return this.http.get<PaginatedResponse<RoleData>>('/api/access/roles', { params })
	}

	public getAllUnpaginated(): Observable<RoleData[]> {
		return this.http
			.get<PaginatedResponse<RoleData>>('/api/access/roles', { params: { limit: QUERY_DEFAULTS.MAX_LIMIT, offset: 0 } })
			.pipe(map((r) => r.data))
	}

	public getByIdWithPermissions(id: number): Observable<RoleWithPermissions> {
		return forkJoin({
			role: this.http.get<RoleData>(`/api/access/roles/${id}`),
			permissions: this.http
				.get<PaginatedResponse<PermissionData>>(`/api/access/roles/${id}/permissions`, {
					params: { limit: QUERY_DEFAULTS.MAX_LIMIT, offset: 0 },
				})
				.pipe(map((r) => r.data)),
		}).pipe(
			map(({ role, permissions }) => ({
				id: role.id,
				code: role.code,
				name: role.name,
				description: role.description,
				removable: role.removable,
				createdAt: role.createdAt,
				updatedAt: role.updatedAt,
				permissions,
			})),
		)
	}

	public create(body: CreateRoleRequest): Observable<RoleData> {
		return this.http.post<RoleData>('/api/access/roles', body)
	}

	public update(id: number, body: UpdateRoleRequest): Observable<RoleData> {
		return this.http.put<RoleData>(`/api/access/roles/${id}`, body)
	}

	public delete(id: number): Observable<void> {
		return this.http.delete<void>(`/api/access/roles/${id}`)
	}

	public assignPermissions(id: number, body: AssignPermissionsRequest): Observable<void> {
		return this.http.put<void>(`/api/access/roles/${id}/permissions`, body)
	}
}
