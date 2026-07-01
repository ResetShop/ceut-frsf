import { InjectionToken } from '@angular/core'
import type { PermissionData } from '@contracts/role/role.types'
import type { Observable } from 'rxjs'

export interface PermissionsApi {
	getAllUnpaginated(): Observable<PermissionData[]>
}

export const PermissionsApi = new InjectionToken<PermissionsApi>('PermissionsApi')
