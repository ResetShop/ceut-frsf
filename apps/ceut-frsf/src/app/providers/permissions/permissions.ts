import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type { PermissionData } from '@contracts/role/role.types'
import { map, type Observable } from 'rxjs'

import type { PermissionsApi } from './permissions.interface'

@Injectable({ providedIn: 'root' })
export class HttpPermissionsApi implements PermissionsApi {
	private readonly http = inject(HttpClient)

	public getAllUnpaginated(): Observable<PermissionData[]> {
		return this.http
			.get<PaginatedResponse<PermissionData>>('/api/access/permissions', {
				params: { limit: QUERY_DEFAULTS.MAX_LIMIT, offset: 0 },
			})
			.pipe(map((r) => r.data))
	}
}
