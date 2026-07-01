import { makeEnvironmentProviders } from '@angular/core'
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
import { of, throwError } from 'rxjs'
import type { AuthApi } from './auth.interface'
import { AuthApi as AuthApiToken } from './auth.interface'

export function createMockLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
	return {
		user: {
			id: 1,
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			roles: [],
		},
		mustChangePassword: false,
		...overrides,
	}
}

export function createMockMeResponse(overrides: Partial<MeResponse> = {}): MeResponse {
	return {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		roles: [],
		mustChangePassword: false,
		...overrides,
	}
}

export class InMemoryAuthApi implements AuthApi {
	private authenticatedUser: MeResponse | null = null
	private loginResponse: LoginResponse | null = null
	private errors = new Map<string, Error>()

	public setAuthenticatedUser(user: MeResponse): void {
		this.authenticatedUser = user
	}

	public setLoginResponse(response: LoginResponse): void {
		this.loginResponse = response
	}

	public clear(): void {
		this.authenticatedUser = null
		this.loginResponse = null
		this.errors.clear()
	}

	public setError(method: keyof AuthApi, error: Error): void {
		this.errors.set(method, error)
	}

	public clearErrors(): void {
		this.errors.clear()
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public login(_params: LoginRequest): Observable<LoginResponse> {
		const error = this.errors.get('login')
		if (error) {
			return throwError(() => error)
		}

		if (this.loginResponse) {
			return of(this.loginResponse)
		}

		// REASON: Matches the real HttpErrorResponse shape that auth.store.ts inspects via error.code
		return throwError(() => ({ error: { code: 'INVALID_CREDENTIALS' } }))
	}

	public logout(): Observable<void> {
		const error = this.errors.get('logout')
		if (error) {
			return throwError(() => error)
		}

		this.authenticatedUser = null
		return of(undefined)
	}

	public refreshToken(): Observable<RefreshResponse> {
		const error = this.errors.get('refreshToken')
		if (error) {
			return throwError(() => error)
		}

		return of({})
	}

	public getMe(): Observable<MeResponse> {
		const error = this.errors.get('getMe')
		if (error) {
			return throwError(() => error)
		}

		if (this.authenticatedUser) {
			return of(this.authenticatedUser)
		}

		return throwError(() => new Error('No session'))
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public changePassword(_params: ChangePasswordRequest): Observable<ChangePasswordResponse> {
		const error = this.errors.get('changePassword')
		if (error) {
			return throwError(() => error)
		}

		return of({ message: 'Password changed successfully' })
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public forgotPassword(_params: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
		const error = this.errors.get('forgotPassword')
		if (error) {
			return throwError(() => error)
		}

		return of({ message: 'If an account exists for that email, a password-reset link has been sent.' })
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public resetPassword(_params: ResetPasswordRequest): Observable<ResetPasswordResponse> {
		const error = this.errors.get('resetPassword')
		if (error) {
			return throwError(() => error)
		}

		return of({ message: 'Your password has been reset. You can now sign in.' })
	}
}

export function provideAuthMock(api: InMemoryAuthApi = new InMemoryAuthApi()) {
	return makeEnvironmentProviders([{ provide: AuthApiToken, useValue: api }])
}
