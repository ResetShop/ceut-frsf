import { InjectionToken } from '@angular/core'
import type {
	ChangePasswordRequest,
	ChangePasswordResponse,
	ForgotPasswordRequest,
	ForgotPasswordResponse,
	LoginRequest,
	LoginResponse,
	MeResponse,
	RefreshResponse,
	ResetPasswordRequest,
	ResetPasswordResponse,
} from '@contracts/auth/auth.types'
import type { Observable } from 'rxjs'

export interface AuthApi {
	login(params: LoginRequest): Observable<LoginResponse>
	logout(): Observable<void>
	refreshToken(): Observable<RefreshResponse>
	getMe(): Observable<MeResponse>
	changePassword(params: ChangePasswordRequest): Observable<ChangePasswordResponse>
	forgotPassword(params: ForgotPasswordRequest): Observable<ForgotPasswordResponse>
	resetPassword(params: ResetPasswordRequest): Observable<ResetPasswordResponse>
}

export const AuthApi = new InjectionToken<AuthApi>('AuthApi')
