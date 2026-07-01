import { HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import type { RefreshResponse } from '@contracts/auth/auth.types'
import type { IPermission } from '@domain/access/permission.interface'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { createMockLoginResponse, createMockMeResponse } from '@providers/auth/auth.mock'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { parseDurationToMs } from '@resetshop/util'
import { clearAllMocks, fn, type MockFn, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { firstValueFrom, NEVER, of, throwError } from 'rxjs'
import { AuthStore } from './auth.store'

describe('AuthStore', () => {
	let store: InstanceType<typeof AuthStore>
	// Record<keyof AuthApi, MockFn> keeps the mock structurally in sync with the AuthApi interface —
	// adding a method to AuthApi forces a corresponding mock key here.
	let authApiMock: Record<keyof AuthApi, MockFn>
	let loggerMock: { info: MockFn; warn: MockFn; error: MockFn; security: MockFn }

	const mockLoginResponse = createMockLoginResponse()
	const mockMeResponse = createMockMeResponse()

	beforeEach(() => {
		clearAllMocks()

		authApiMock = {
			login: fn(),
			logout: fn(),
			refreshToken: fn(),
			getMe: fn(),
			changePassword: fn(),
			forgotPassword: fn(),
			resetPassword: fn(),
		}
		loggerMock = { info: fn(), warn: fn(), error: fn(), security: fn() }

		authApiMock.getMe.mockReturnValue(throwError(() => new Error('No session')))

		TestBed.configureTestingModule({
			providers: [AuthStore, { provide: AuthApi, useValue: authApiMock }, { provide: Logger, useValue: loggerMock }],
		})

		store = TestBed.inject(AuthStore)
	})

	describe('initial state', () => {
		it('should have correct initial state', () => {
			expect(store.currentUser()).toBeNull()
			expect(store.isTokenRefreshing()).toBe(false)
			expect(store.isLoggingIn()).toBe(false)
			expect(store.isLoggingOut()).toBe(false)
			expect(store.loginError()).toBeNull()
			expect(store.mustChangePassword()).toBe(false)
		})

		it('should have correct computed signals', () => {
			expect(store.isAuthenticated()).toBe(false)
			expect(store.userPermissions()).toEqual([])
			expect(store.userRoles()).toEqual([])
		})
	})

	describe('login', () => {
		it('should set isLoggingIn to true when login starts', () => {
			authApiMock.login.mockReturnValue(NEVER)
			store.login({ email: 'test@example.com', password: 'password' })

			expect(store.isLoggingIn()).toBe(true)
		})

		it('should update state on successful login', () => {
			authApiMock.login.mockReturnValue(of(mockLoginResponse))

			store.login({ email: 'test@example.com', password: 'password' })

			expect(store.currentUser()).toBeTruthy()
			expect(store.currentUser()?.email).toBe('test@example.com')
			expect(store.isLoggingIn()).toBe(false)
			expect(store.loginError()).toBeNull()
			expect(store.mustChangePassword()).toBe(false)
		})

		it('should populate roles + permissions on currentUser when login response carries them', () => {
			// Guards against the empty-roles window: post-login, currentUser must already
			// be permission-aware so navigation and guards see the right state without
			// waiting for validateSession to run.
			authApiMock.login.mockReturnValue(
				of(
					createMockLoginResponse({
						user: {
							id: 7,
							email: 'admin@example.com',
							firstName: 'Admin',
							lastName: 'User',
							roles: [
								{
									id: 1,
									code: 'admin',
									name: 'Administrator',
									description: 'Full access',
									removable: true,
									createdAt: new Date('2026-01-01T00:00:00.000Z'),
									updatedAt: new Date('2026-01-01T00:00:00.000Z'),
									permissions: [
										{
											id: 1,
											name: 'Read users',
											description: 'View users',
											module: 'admin',
											resource: 'users',
											action: 'read',
										},
									],
								},
							],
						},
					}),
				),
			)

			store.login({ email: 'admin@example.com', password: 'password' })

			expect(store.currentUser()?.roles).toHaveLength(1)
			expect(store.currentUser()?.roles[0].code).toBe('admin')
			expect(store.currentUser()?.permissions).toHaveLength(1)
			expect(store.currentUser()?.hasPermission('admin:users:read')).toBe(true)
			expect(store.userPermissions()).toHaveLength(1)
		})

		it('should set mustChangePassword when login response requires password change', () => {
			authApiMock.login.mockReturnValue(of({ ...mockLoginResponse, mustChangePassword: true }))

			store.login({ email: 'test@example.com', password: 'password' })

			expect(store.mustChangePassword()).toBe(true)
		})

		it('should reset isTokenRefreshing on successful login', () => {
			store.startTokenRefresh()
			expect(store.isTokenRefreshing()).toBe(true)

			authApiMock.login.mockReturnValue(of(mockLoginResponse))
			store.login({ email: 'test@example.com', password: 'password' })

			expect(store.isTokenRefreshing()).toBe(false)
		})

		it('should set loginError on failed login', () => {
			const errorResponse = { error: { code: 'INVALID_CREDENTIALS' } }
			authApiMock.login.mockReturnValue(throwError(() => errorResponse))

			store.login({ email: 'test@example.com', password: 'wrong' })

			expect(store.isLoggingIn()).toBe(false)
			expect(store.loginError()).toEqual({ code: 'INVALID_CREDENTIALS' })
			expect(store.currentUser()).toBeNull()
		})
	})

	describe('logout', () => {
		beforeEach(() => {
			store.updateCurrentUser(createMockUser())
		})

		it('should clear current user and mustChangePassword immediately', () => {
			authApiMock.logout.mockReturnValue(of(undefined))

			store.logout()

			expect(store.currentUser()).toBeNull()
			expect(store.mustChangePassword()).toBe(false)
		})

		it('should set isLoggingOut to true', () => {
			authApiMock.logout.mockReturnValue(NEVER)

			store.logout()

			expect(store.isLoggingOut()).toBe(true)
		})

		it('should set isLoggingOut to false on success', () => {
			authApiMock.logout.mockReturnValue(of(undefined))

			store.logout()

			expect(store.isLoggingOut()).toBe(false)
		})

		it('should set isLoggingOut to false on error', () => {
			authApiMock.logout.mockReturnValue(throwError(() => new Error('Network error')))

			store.logout()

			expect(store.isLoggingOut()).toBe(false)
		})
	})

	describe('refreshToken', () => {
		it('should return the API response observable', () => {
			const mockRefreshResponse: RefreshResponse = {}
			authApiMock.refreshToken.mockReturnValue(of(mockRefreshResponse))

			let emitted = false
			store.refreshToken().subscribe(() => {
				emitted = true
			})

			expect(emitted).toBe(true)
		})
	})

	describe('changePassword', () => {
		it('clears mustChangePassword and the error on success', () => {
			authApiMock.login.mockReturnValue(of({ ...mockLoginResponse, mustChangePassword: true }))
			store.login({ email: 'test@example.com', password: 'password' })
			expect(store.mustChangePassword()).toBe(true)

			authApiMock.changePassword.mockReturnValue(of({ message: 'Password changed successfully' }))

			store.changePassword({ oldPassword: 'old-password', newPassword: 'a-fresh-secure-password' })

			expect(store.mustChangePassword()).toBe(false)
			expect(store.isChangingPassword()).toBe(false)
			expect(store.changePasswordError()).toBeNull()
		})

		it('sets changePasswordError on failure without clearing mustChangePassword', () => {
			authApiMock.login.mockReturnValue(of({ ...mockLoginResponse, mustChangePassword: true }))
			store.login({ email: 'test@example.com', password: 'password' })

			authApiMock.changePassword.mockReturnValue(
				throwError(
					() => new HttpErrorResponse({ status: 400, error: { code: 'OLD_PASSWORD_MISMATCH', message: 'wrong' } }),
				),
			)

			store.changePassword({ oldPassword: 'wrong', newPassword: 'a-fresh-secure-password' })

			expect(store.changePasswordError()?.code).toBe('OLD_PASSWORD_MISMATCH')
			expect(store.isChangingPassword()).toBe(false)
			expect(store.mustChangePassword()).toBe(true)
		})
	})

	describe('forgotPassword', () => {
		it('flips resetRequested immediately, without waiting for the request to resolve', () => {
			// NEVER => the request never completes. The confirmation must still appear, proving the flip
			// is optimistic and the UI timing cannot leak whether the account exists.
			authApiMock.forgotPassword.mockReturnValue(NEVER)

			store.forgotPassword('user@example.com')

			expect(store.resetRequested()).toBe(true)
		})

		it('keeps resetRequested true when the request errors (neutral — no enumeration)', () => {
			authApiMock.forgotPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))

			store.forgotPassword('user@example.com')

			expect(store.resetRequested()).toBe(true)
		})

		it('logs the error when the best-effort request fails (observability preserved)', () => {
			const err = new HttpErrorResponse({ status: 500 })
			authApiMock.forgotPassword.mockReturnValue(throwError(() => err))

			store.forgotPassword('user@example.com')

			expect(loggerMock.error.calls).toContainEqual(['AuthStore', 'forgotPassword failed', err])
		})
	})

	describe('clearResetState', () => {
		it('clears resetRequested set optimistically by forgotPassword', () => {
			authApiMock.forgotPassword.mockReturnValue(NEVER)
			store.forgotPassword('user@example.com')
			expect(store.resetRequested()).toBe(true)

			store.clearResetState()

			expect(store.resetRequested()).toBe(false)
		})

		it('clears resetPasswordError left by a failed resetPassword', () => {
			authApiMock.resetPassword.mockReturnValue(
				throwError(
					() => new HttpErrorResponse({ status: 400, error: { code: 'RESET_TOKEN_INVALID', message: 'bad' } }),
				),
			)
			store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })
			expect(store.resetPasswordError()).not.toBeNull()

			store.clearResetState()

			expect(store.resetPasswordError()).toBeNull()
		})

		it('clears isResettingPassword while a resetPassword call is in flight', () => {
			authApiMock.resetPassword.mockReturnValue(NEVER)
			store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })
			expect(store.isResettingPassword()).toBe(true)

			store.clearResetState()

			expect(store.isResettingPassword()).toBe(false)
		})

		it('clears both throttle timestamps left by 429 responses', () => {
			useFakeTimers()
			try {
				const rateLimited = () =>
					throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '900' }) }))
				authApiMock.forgotPassword.mockReturnValue(rateLimited())
				authApiMock.resetPassword.mockReturnValue(rateLimited())
				store.forgotPassword('user@example.com')
				store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })
				expect(store.resetThrottledUntil()).not.toBeNull()
				expect(store.resetPasswordThrottledUntil()).not.toBeNull()

				store.clearResetState()

				expect(store.resetThrottledUntil()).toBeNull()
				expect(store.resetPasswordThrottledUntil()).toBeNull()
			} finally {
				useRealTimers()
			}
		})
	})

	describe('resetPassword', () => {
		it('clears the error on success', () => {
			authApiMock.resetPassword.mockReturnValue(of({ message: 'reset' }))

			store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })

			expect(store.isResettingPassword()).toBe(false)
			expect(store.resetPasswordError()).toBeNull()
		})

		it('sets resetPasswordError on failure', () => {
			authApiMock.resetPassword.mockReturnValue(
				throwError(
					() => new HttpErrorResponse({ status: 400, error: { code: 'RESET_TOKEN_INVALID', message: 'bad' } }),
				),
			)

			store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })

			expect(store.resetPasswordError()?.code).toBe('RESET_TOKEN_INVALID')
			expect(store.isResettingPassword()).toBe(false)
		})
	})

	describe('validateSession', () => {
		it('should call getMe and update currentUser on success', async () => {
			authApiMock.getMe.mockReturnValue(of(mockMeResponse))

			const emittedUser = await firstValueFrom(store.validateSession())

			expect(store.currentUser()?.email).toBe('test@example.com')
			expect(emittedUser.email).toBe('test@example.com')
		})

		it('should propagate errors without catching', async () => {
			const testError = new Error('Unauthorized')
			authApiMock.getMe.mockReturnValue(throwError(() => testError))

			await expect(firstValueFrom(store.validateSession())).rejects.toBe(testError)
		})

		it('should re-derive mustChangePassword from the me response (survives reload)', async () => {
			authApiMock.getMe.mockReturnValue(of(createMockMeResponse({ mustChangePassword: true })))

			await firstValueFrom(store.validateSession())

			expect(store.mustChangePassword()).toBe(true)
		})
	})

	describe('computed signals', () => {
		it('should compute isAuthenticated based on currentUser', () => {
			expect(store.isAuthenticated()).toBe(false)

			store.updateCurrentUser(createMockUser())

			expect(store.isAuthenticated()).toBe(true)
		})

		it('should compute userPermissions from currentUser', () => {
			const mockPermission: IPermission = {
				id: 1,
				resource: 'users',
				name: 'users:read',
				description: 'Read users',
				module: 'admin',
				action: 'read',
				identifier: 'users:read',
			}

			store.updateCurrentUser(createMockUser({ permissions: [mockPermission] }))

			expect(store.userPermissions()).toEqual([mockPermission])
		})
	})

	describe('token refresh state management', () => {
		it('should manage token refreshing flag', () => {
			expect(store.isTokenRefreshing()).toBe(false)

			store.startTokenRefresh()
			expect(store.isTokenRefreshing()).toBe(true)

			store.completeTokenRefresh()
			expect(store.isTokenRefreshing()).toBe(false)
		})

		it('should reset refresh state on failTokenRefresh', () => {
			store.startTokenRefresh()
			expect(store.isTokenRefreshing()).toBe(true)

			store.failTokenRefresh()
			expect(store.isTokenRefreshing()).toBe(false)
		})
	})

	describe('lockout & throttle state', () => {
		it('captures loginLockedUntil from a 401 ACCOUNT_LOCKED response', () => {
			const lockedUntil = new Date('2026-06-01T00:15:00.000Z').toISOString()
			authApiMock.login.mockReturnValue(
				throwError(
					() =>
						new HttpErrorResponse({ status: 401, error: { code: 'ACCOUNT_LOCKED', message: 'locked', lockedUntil } }),
				),
			)

			store.login({ email: 'user@example.com', password: 'wrong' })

			expect(store.loginLockedUntil()).toBe(lockedUntil)
		})

		it('derives loginThrottledUntil from a 429 Retry-After on the login endpoint', () => {
			useFakeTimers()
			try {
				authApiMock.login.mockReturnValue(
					throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '900' }) })),
				)

				store.login({ email: 'user@example.com', password: 'wrong' })

				expect(store.loginThrottledUntil()).toBe(new Date(Date.now() + parseDurationToMs('15m')).toISOString())
				expect(store.loginLockedUntil()).toBeNull()
			} finally {
				useRealTimers()
			}
		})

		it('clears loginLockedUntil on a successful login', () => {
			const lockedUntil = new Date('2026-06-01T00:15:00.000Z').toISOString()
			authApiMock.login.mockReturnValue(
				throwError(
					() =>
						new HttpErrorResponse({ status: 401, error: { code: 'ACCOUNT_LOCKED', message: 'locked', lockedUntil } }),
				),
			)
			store.login({ email: 'user@example.com', password: 'wrong' })
			expect(store.loginLockedUntil()).toBe(lockedUntil)

			authApiMock.login.mockReturnValue(of(mockLoginResponse))
			store.login({ email: 'user@example.com', password: 'right' })

			expect(store.loginLockedUntil()).toBeNull()
		})

		it('derives resetThrottledUntil from a 429 Retry-After on forgotPassword', () => {
			useFakeTimers()
			try {
				authApiMock.forgotPassword.mockReturnValue(
					throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '900' }) })),
				)

				store.forgotPassword('user@example.com')

				expect(store.resetThrottledUntil()).toBe(new Date(Date.now() + parseDurationToMs('15m')).toISOString())
			} finally {
				useRealTimers()
			}
		})

		it('derives resetPasswordThrottledUntil from a 429 and suppresses the generic error', () => {
			useFakeTimers()
			try {
				authApiMock.resetPassword.mockReturnValue(
					throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '900' }) })),
				)

				store.resetPassword({ token: 'tok', newPassword: 'a-fresh-secure-password' })

				expect(store.resetPasswordThrottledUntil()).toBe(new Date(Date.now() + parseDurationToMs('15m')).toISOString())
				expect(store.resetPasswordError()).toBeNull()
			} finally {
				useRealTimers()
			}
		})
	})
})
