import { HttpErrorResponse } from '@angular/common/http'
import { computed, inject } from '@angular/core'
import { type AuthErrorResponse, type LoginErrorResponse, PublicAuthErrorCode } from '@contracts/auth/auth.errors'
import type { ChangePasswordRequest, ResetPasswordRequest } from '@contracts/auth/auth.types'
import { mapLoginResponseToUser, mapMeResponseToUser } from '@domain/auth/auth.mapper'
import type { IUser } from '@domain/user/user.interface'
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'
import { rxMethod } from '@ngrx/signals/rxjs-interop'
import { AuthApi } from '@providers/auth/auth.interface'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { catchError, EMPTY, exhaustMap, map, pipe, switchMap, tap } from 'rxjs'
import { initialAuthState } from './auth.types'

/**
 * Converts a 429 rate-limit response's `Retry-After` header (whole seconds) into an absolute ISO-8601
 * instant the page countdown can tick down to. Returns null for non-429 responses or a missing/invalid
 * header. Shared by the forgot-password and reset-password flows.
 */
function throttledUntilFrom(error: HttpErrorResponse): string | null {
	if (error.status !== 429) return null
	const retryAfterSeconds = Number(error.headers.get('Retry-After'))
	if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) return null
	return new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
}

/**
 * AuthStore - Signal Store for authentication state
 *
 * Manages authentication state using NgRx Signal Store.
 * Components inject this store directly for all auth operations.
 * Uses AuthApi for HTTP calls.
 *
 * Session validation is performed by the route guards on every navigation
 * via `validateSession()`. Works on both browser and server platforms —
 * cookies are forwarded by the SSR cookie interceptor on the server side.
 */
export const AuthStore = signalStore(
	{ providedIn: 'root' },
	withState(initialAuthState),
	withComputed((store) => ({
		isAuthenticated: computed(() => !!store.currentUser()),
		userPermissions: computed(() => store.currentUser()?.permissions ?? []),
		userRoles: computed(() => store.currentUser()?.roles ?? []),
	})),
	withMethods((store) => {
		const authApi = inject(AuthApi)
		const loggerService = inject(Logger)

		return {
			/**
			 * Login with email and password
			 *
			 * Initiates login flow and updates state with result.
			 * The server sets the access token cookie — no client-side storage needed.
			 */
			login: rxMethod<{ email: string; password: string }>(
				pipe(
					tap(() =>
						patchState(store, {
							isLoggingIn: true,
							loginError: null,
							loginLockedUntil: null,
							loginThrottledUntil: null,
							networkError: false,
						}),
					),
					switchMap((params) =>
						authApi.login(params).pipe(
							tap({
								next: (response) => {
									const user = mapLoginResponseToUser(response)
									patchState(store, {
										currentUser: user,
										mustChangePassword: response.mustChangePassword,
										isLoggingIn: false,
										isTokenRefreshing: false,
										loginError: null,
										loginLockedUntil: null,
										loginThrottledUntil: null,
										networkError: false,
									})
								},
								error: (error: HttpErrorResponse) => {
									const isNetworkError = error.status === 0 || error.status >= 500
									const body = error.error as LoginErrorResponse | undefined
									patchState(store, {
										isLoggingIn: false,
										loginError: isNetworkError ? null : error.error,
										// Only ACCOUNT_LOCKED carries lockedUntil; drives the lockout half of the login countdown.
										loginLockedUntil: isNetworkError ? null : (body?.lockedUntil ?? null),
										// A 429 from the per-IP login rate limiter carries Retry-After; same countdown UX.
										loginThrottledUntil: isNetworkError ? null : throttledUntilFrom(error),
										networkError: isNetworkError,
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			/**
			 * Change the authenticated user's password.
			 *
			 * On success the must-change-password flag is cleared (other sessions are revoked
			 * server-side); the change-password page reacts to `isChangingPassword` returning to
			 * false with no `changePasswordError` and navigates onward.
			 */
			changePassword: rxMethod<ChangePasswordRequest>(
				pipe(
					tap(() => patchState(store, { isChangingPassword: true, changePasswordError: null })),
					switchMap((body) =>
						authApi.changePassword(body).pipe(
							tap({
								next: () =>
									patchState(store, {
										isChangingPassword: false,
										changePasswordError: null,
										mustChangePassword: false,
									}),
								error: (error: HttpErrorResponse) => {
									loggerService.error('AuthStore', 'changePassword failed', error)
									const errorBody = error.error as AuthErrorResponse | undefined
									patchState(store, {
										isChangingPassword: false,
										changePasswordError: errorBody?.code
											? errorBody
											: { code: PublicAuthErrorCode.GENERIC, message: 'Failed to change password' },
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			/**
			 * Request a self-service password reset for an email. Flips `resetRequested` optimistically —
			 * before the request is even sent — so the neutral "if an account exists, a link was sent"
			 * confirmation appears with timing independent of whether the account exists (no enumeration).
			 * The request fires best-effort: errors are logged for observability but never surfaced, and
			 * the confirmation is never rolled back.
			 */
			forgotPassword: rxMethod<string>(
				pipe(
					tap(() => patchState(store, { resetRequested: true, resetThrottledUntil: null })),
					switchMap((email) =>
						authApi.forgotPassword({ email }).pipe(
							tap({
								error: (error: HttpErrorResponse) => {
									loggerService.error('AuthStore', 'forgotPassword failed', error)
									// A 429 is per-IP (fires before any account lookup), so surfacing its countdown over the
									// optimistic confirmation leaks nothing about account existence.
									const throttledUntil = throttledUntilFrom(error)
									if (throttledUntil) patchState(store, { resetThrottledUntil: throttledUntil })
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			/**
			 * Complete a self-service password reset with a token + new password. On success the
			 * confirm page navigates to login; on failure `resetPasswordError` is set for display.
			 */
			resetPassword: rxMethod<ResetPasswordRequest>(
				pipe(
					tap(() =>
						patchState(store, {
							isResettingPassword: true,
							resetPasswordError: null,
							resetPasswordThrottledUntil: null,
						}),
					),
					switchMap((body) =>
						authApi.resetPassword(body).pipe(
							tap({
								next: () =>
									patchState(store, {
										isResettingPassword: false,
										resetPasswordError: null,
										resetPasswordThrottledUntil: null,
									}),
								error: (error: HttpErrorResponse) => {
									loggerService.error('AuthStore', 'resetPassword failed', error)
									// On a 429, show the countdown instead of a generic error banner (per-IP, no enumeration).
									const throttledUntil = throttledUntilFrom(error)
									if (throttledUntil) {
										patchState(store, {
											isResettingPassword: false,
											resetPasswordError: null,
											resetPasswordThrottledUntil: throttledUntil,
										})
										return
									}
									const errorBody = error.error as AuthErrorResponse | undefined
									patchState(store, {
										isResettingPassword: false,
										resetPasswordError: errorBody?.code
											? errorBody
											: { code: PublicAuthErrorCode.GENERIC, message: 'Failed to reset password' },
									})
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			/**
			 * Logout user - clear state and revoke tokens
			 *
			 * Uses exhaustMap to guarantee the revocation request completes —
			 * duplicate calls while one is in-flight are silently dropped.
			 * The server deletes the cookies. Navigation should be handled by the caller.
			 */
			logout: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { currentUser: null, mustChangePassword: false, isLoggingOut: true })),
					exhaustMap(() =>
						authApi.logout().pipe(
							tap({
								next: () => patchState(store, { isLoggingOut: false }),
								error: (err) => {
									loggerService.error('AuthStore', 'Logout error', err)
									patchState(store, { isLoggingOut: false })
								},
							}),
							catchError(() => EMPTY),
						),
					),
				),
			),

			/**
			 * Refresh access token
			 *
			 * Called by the token refresh interceptor when a 401 response is received.
			 * The server sets the new cookies — no client-side token handling needed.
			 */
			refreshToken() {
				return authApi.refreshToken()
			},

			/**
			 * Start token refresh - sets refreshing flag
			 */
			startTokenRefresh() {
				patchState(store, { isTokenRefreshing: true })
			},

			/**
			 * Complete token refresh - clears refreshing flag
			 */
			completeTokenRefresh() {
				patchState(store, { isTokenRefreshing: false })
			},

			/**
			 * Handle token refresh failure - resets refresh state
			 */
			failTokenRefresh() {
				patchState(store, { isTokenRefreshing: false })
			},

			/**
			 * Validate the current session by calling GET /api/auth/me
			 *
			 * Calls getMe(), maps the response to IUser, and patches currentUser.
			 * Does NOT catch errors — the caller (e.g. authGuard) owns the
			 * redirect/error-handling decision.
			 */
			validateSession() {
				return authApi.getMe().pipe(
					// Re-derive the forced-change state from the server on every navigation so it
					// survives a page reload — the access token does not carry the flag.
					tap((response) => patchState(store, { mustChangePassword: response.mustChangePassword })),
					map((response) => mapMeResponseToUser(response)),
					tap((user) => patchState(store, { currentUser: user })),
				)
			},

			/**
			 * Update current user
			 */
			updateCurrentUser(user: IUser) {
				patchState(store, { currentUser: user })
			},

			/**
			 * Clear all transient password-reset state. The reset flow's state lives in the root store,
			 * so the reset-request and reset-confirm pages call this on entry to guarantee a fresh form
			 * instead of a stale confirmation/error lingering from a previous visit.
			 */
			clearResetState() {
				patchState(store, {
					resetRequested: false,
					resetThrottledUntil: null,
					isResettingPassword: false,
					resetPasswordError: null,
					resetPasswordThrottledUntil: null,
				})
			},
		}
	}),
)
