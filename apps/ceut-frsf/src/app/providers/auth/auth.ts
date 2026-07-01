import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
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
import type { AuthApi } from './auth.interface'

/**
 * HTTP implementation of AuthApi.
 * Pure API client for authentication endpoints.
 * No state management - just HTTP operations.
 */
@Injectable({ providedIn: 'root' })
export class HttpAuthApi implements AuthApi {
	private readonly http = inject(HttpClient)

	/**
	 * Login with email and password
	 */
	public login(params: LoginRequest): Observable<LoginResponse> {
		return this.http.post<LoginResponse>('/api/auth/login', params)
	}

	/**
	 * Logout user - revoke server-side tokens
	 */
	public logout(): Observable<void> {
		return this.http.post<void>('/api/auth/logout', {})
	}

	/**
	 * Refresh access token using refresh token from HttpOnly cookie
	 */
	public refreshToken(): Observable<RefreshResponse> {
		return this.http.post<RefreshResponse>('/api/auth/refresh', {})
	}

	/**
	 * Token introspection - verify token and get user data
	 */
	public getMe(): Observable<MeResponse> {
		return this.http.get<MeResponse>('/api/auth/me')
	}

	/**
	 * Change the authenticated user's password (requires the current password)
	 */
	public changePassword(params: ChangePasswordRequest): Observable<ChangePasswordResponse> {
		return this.http.post<ChangePasswordResponse>('/api/auth/change-password', params)
	}

	/**
	 * Request a self-service password reset (sends a reset link if the account exists)
	 */
	public forgotPassword(params: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
		return this.http.post<ForgotPasswordResponse>('/api/auth/forgot-password', params)
	}

	/**
	 * Complete a self-service password reset using a token from the emailed link
	 */
	public resetPassword(params: ResetPasswordRequest): Observable<ResetPasswordResponse> {
		return this.http.post<ResetPasswordResponse>('/api/auth/reset-password', params)
	}
}
