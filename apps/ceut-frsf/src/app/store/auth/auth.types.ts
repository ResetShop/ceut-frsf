import type { AuthErrorResponse, LoginErrorResponse } from '@contracts/auth/auth.errors'
import type { IUser } from '@domain/user/user.interface'

/**
 * Auth state structure for NgRx Signal Store
 */
export interface AuthState {
	/** Currently authenticated user, or null if not logged in */
	currentUser: IUser | null

	/** Whether a token refresh operation is currently in progress */
	isTokenRefreshing: boolean

	/** Whether a login request is currently in progress */
	isLoggingIn: boolean

	/** Whether a logout request is currently in progress */
	isLoggingOut: boolean

	/** Login error from the last failed login attempt (null if no error) */
	loginError: LoginErrorResponse | null

	/** ISO-8601 instant the account lockout expires (from a 401 ACCOUNT_LOCKED), or null. Drives the login countdown. */
	loginLockedUntil: string | null

	/** ISO-8601 instant the per-IP login rate limit resets (from a 429 `Retry-After`), or null. Drives the login countdown. */
	loginThrottledUntil: string | null

	/** Whether a network/server error occurred during login (5xx or connection failure) */
	networkError: boolean

	/** Whether the user must change their password (set at login, reset on logout) */
	mustChangePassword: boolean

	/** Whether a change-password request is currently in progress */
	isChangingPassword: boolean

	/** Error from the last failed change-password attempt (null if no error) */
	changePasswordError: AuthErrorResponse | null

	/**
	 * Whether the neutral "link sent" confirmation should be shown. Flipped optimistically the moment
	 * a forgot-password request is submitted (the API call fires best-effort) so the UI never reveals,
	 * via timing, whether the email belongs to an account.
	 */
	resetRequested: boolean

	/** ISO-8601 instant the forgot-password rate limit resets (from a 429 `Retry-After`), or null. Drives the request-page countdown. */
	resetThrottledUntil: string | null

	/** Whether a reset-password (with token) call is in progress */
	isResettingPassword: boolean

	/** Error from the last failed reset-password attempt (null if no error) */
	resetPasswordError: AuthErrorResponse | null

	/** ISO-8601 instant the reset-password rate limit resets (from a 429 `Retry-After`), or null. Drives the confirm-page countdown. */
	resetPasswordThrottledUntil: string | null
}

/**
 * Initial auth state
 */
export const initialAuthState: AuthState = {
	currentUser: null,
	isTokenRefreshing: false,
	isLoggingIn: false,
	isLoggingOut: false,
	loginError: null,
	loginLockedUntil: null,
	loginThrottledUntil: null,
	networkError: false,
	mustChangePassword: false,
	isChangingPassword: false,
	changePasswordError: null,
	resetRequested: false,
	resetThrottledUntil: null,
	isResettingPassword: false,
	resetPasswordError: null,
	resetPasswordThrottledUntil: null,
}
