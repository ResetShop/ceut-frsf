import { InjectionToken } from '@angular/core'
import type { PaginatedResponse, SearchPaginationParams } from '@contracts/common/pagination.types'
import type {
	CreateUserRequest,
	CreateUserResponse,
	ManagedUser,
	ResetPasswordResponse,
	UpdateUserRequest,
	UpdateUserStatusRequest,
} from '@contracts/user/user.types'
import type { Observable } from 'rxjs'

export interface UsersApi {
	getAll(params?: SearchPaginationParams): Observable<PaginatedResponse<ManagedUser>>
	getById(id: number): Observable<ManagedUser>
	create(body: CreateUserRequest): Observable<CreateUserResponse>
	update(id: number, body: UpdateUserRequest): Observable<ManagedUser>
	delete(id: number): Observable<void>
	updateStatus(id: number, body: UpdateUserStatusRequest): Observable<ManagedUser>
	resetPassword(id: number): Observable<ResetPasswordResponse>
}

export const UsersApi = new InjectionToken<UsersApi>('UsersApi')
