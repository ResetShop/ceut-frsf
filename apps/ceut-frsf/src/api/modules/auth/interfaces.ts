import type { UserStatus } from '@contracts/user/user.constants'
import type { AuthUser } from '@contracts/user/user.types'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import type { UserData } from '../user/interfaces'

export interface AuthenticationData {
	id: number
	userId: number
	passwordHash: string
	failedLoginAttempts: number
	lockedUntil: Date | null
	mustChangePassword: boolean
}

/**
 * Result from incrementing failed attempts and optionally locking account.
 */
export interface IncrementAttemptsResult {
	/** The new failed attempts count after incrementing */
	failedAttempts: number
	/** True if account was locked due to reaching threshold */
	wasLocked: boolean
	/** Timestamp when lockout expires (only set if wasLocked is true) */
	lockedUntil?: Date
}

/**
 * Parameters for inserting the initial authentication row of a newly-created user.
 */
export interface CreateInitialPasswordParams {
	userId: number
	passwordHash: string
	mustChangePassword: boolean
}

export interface AuthenticationRepository {
	findByUserId(userId: number): Promise<AuthenticationData | null>
	incrementFailedAttempts(userId: number): Promise<number>
	lockAccount(userId: number, lockedUntil: Date): Promise<void>
	resetFailedAttempts(userId: number): Promise<void>
	incrementAndLockIfNeeded(userId: number): Promise<IncrementAttemptsResult>
	/**
	 * Inserts the initial authentication row for a newly-created user.
	 * Accepts an optional `tx` so the caller can compose this write into a
	 * single transaction spanning the user, auth, and role tables.
	 */
	createInitialPassword(params: CreateInitialPasswordParams, tx?: DrizzleTransaction): Promise<void>
	/**
	 * Replaces a user's password hash and sets the must-change-password flag.
	 * Skips deleted users (joined check on the `user` table).
	 * @returns true if updated, false if the user does not exist or is deleted
	 */
	setPassword(
		userId: number,
		passwordHash: string,
		mustChangePassword: boolean,
		tx?: DrizzleTransaction,
	): Promise<boolean>
}

export interface RefreshTokenData {
	id: number
	userId: number
	tokenFamily: string
	tokenHash: string
	expiresAt: Date
	isRevoked: boolean
	createdAt: Date | null
	revokedAt: Date | null
}

/**
 * Subset of user fields returned by the joined token-user query.
 */
export interface RefreshTokenUserProfile {
	id: number
	email: string
	firstName: string
	lastName: string
	status: UserStatus
}

/**
 * Joined result from findByTokenHashWithUser — token data plus the owning user's profile.
 * Eliminates the need for a separate user lookup during token refresh.
 */
export interface RefreshTokenWithUser {
	token: RefreshTokenData
	user: RefreshTokenUserProfile
}

export interface CreateRefreshTokenParams {
	userId: number
	tokenFamily: string
	tokenHash: string
	expiresAt: Date
}

/**
 * Result from bulk expired token cleanup operation.
 */
export interface CleanupResult {
	/** Number of tokens deleted */
	deletedCount: number
	/** True if cleanup hit the max batch limit and more expired tokens may remain */
	incomplete: boolean
}

export interface RefreshTokenRepository {
	findByTokenHashWithUser(tokenHash: string): Promise<RefreshTokenWithUser | null>
	create(params: CreateRefreshTokenParams, tx?: DrizzleTransaction): Promise<RefreshTokenData>
	revokeToken(tokenId: number): Promise<void>
	revokeAllForUser(userId: number): Promise<void>
	/**
	 * Revokes all of a user's refresh tokens except the one matching `exceptTokenHash`.
	 * Accepts an optional `tx` for composition with other writes in one transaction.
	 */
	revokeAllForUserExcept(userId: number, exceptTokenHash: string, tx?: DrizzleTransaction): Promise<void>
	revokeTokenFamily(tokenFamily: string): Promise<void>
	deleteExpiredTokensForUser(userId: number): Promise<number>
	tryAcquireCleanupLock(): Promise<boolean>
	releaseCleanupLock(): Promise<void>
	deleteAllExpiredTokens(): Promise<CleanupResult>
	/**
	 * Runs a callback inside a transaction, exposing the handle so the auth service can
	 * compose the password write + token revocation + token rotation atomically.
	 */
	runInTransaction<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T>
}

export interface PasswordResetTokenData {
	userId: number
	expiresAt: Date
	usedAt: Date | null
}

export interface CreatePasswordResetTokenParams {
	userId: number
	tokenHash: string
	expiresAt: Date
}

/**
 * Repository for self-service password-reset tokens. Stores only token hashes (see the
 * `password_reset_token` schema). `runInTransaction` (inherited from BaseRepository) lets the
 * service compose the password write + token consumption atomically.
 */
export interface PasswordResetTokenRepository {
	create(params: CreatePasswordResetTokenParams): Promise<void>
	findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null>
	markUsed(tokenHash: string, tx?: DrizzleTransaction): Promise<void>
	invalidateAllForUser(userId: number): Promise<void>
	runInTransaction<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T>
}

// ============================================================================
// Auth Service Types & Interface
// ============================================================================

/**
 * Credentials for user authentication.
 */
export interface AuthCredentials {
	email: string
	password: string
}

/**
 * Complete authentication result from the service layer.
 * The controller sets both `token` and `refreshToken` as HttpOnly cookies
 * and returns `user` and `mustChangePassword` in the HTTP response body.
 */
export interface AuthResult {
	user: AuthUser
	mustChangePassword: boolean
	token: string
	refreshToken: string
}

/**
 * Result from token refresh operation.
 * The controller sets both `token` and `refreshToken` as HttpOnly cookies.
 * The HTTP response body is empty.
 */
export interface RefreshResult {
	token: string
	refreshToken: string
}

/**
 * Parameters for changing an authenticated user's password.
 * `currentRefreshToken` (from the caller's cookie) is preserved when revoking the user's other
 * sessions, so the in-flight session survives the change; omit it to revoke every session.
 */
export interface ChangePasswordParams {
	userId: number
	oldPassword: string
	newPassword: string
	currentRefreshToken?: string
}

/**
 * Service interface for authentication operations: login, logout, token refresh, and password change.
 */
export interface AuthService {
	authenticate(credentials: AuthCredentials): Promise<AuthResult>
	refreshToken(token: string): Promise<RefreshResult>
	logout(userId: number): Promise<void>
	changePassword(params: ChangePasswordParams): Promise<void>
}

/**
 * Service interface for password-credential operations.
 * Encapsulates timing-safe password verification and failed-login/lockout tracking —
 * the password mechanism as a cohesive unit. Designed as an extension seam: future
 * non-password auth mechanisms (OAuth, SSO, passkeys) become sibling collaborators
 * without changing AuthService.
 */
export interface AuthPasswordService {
	/**
	 * Validates credentials with timing-safe comparison and tracks failed attempts.
	 * Accepts nullable user/authRecord to preserve timing-safety (see implementation).
	 * @throws AuthError INVALID_CREDENTIALS when validation fails
	 */
	validateCredentials(
		user: UserData | null,
		authRecord: AuthenticationData | null,
		password: string,
	): Promise<{ user: UserData; authRecord: AuthenticationData }>

	/**
	 * Changes an authenticated user's password: verifies the current password, hashes the new one,
	 * and persists it while clearing the must-change-password flag. Accepts an optional `tx` so the
	 * caller can compose the write with session revocation in a single transaction.
	 * @throws AuthError OLD_PASSWORD_MISMATCH when the current password is incorrect
	 */
	changePassword(userId: number, oldPassword: string, newPassword: string, tx?: DrizzleTransaction): Promise<void>

	/**
	 * Returns whether the user must change their password before proceeding. Read fresh from the
	 * authentication record (the access token does not carry this flag), so `/api/auth/me` reflects
	 * a password change immediately on the next navigation.
	 */
	getMustChangePassword(userId: number): Promise<boolean>
}

/**
 * Service interface for token maintenance operations.
 * Separated from AuthService per Interface Segregation Principle:
 * consumers like cron jobs and the cleanup endpoint only need this method,
 * not the full authentication surface.
 *
 * Future token maintenance operations (e.g., bulk revocation) should be
 * added here rather than to AuthService.
 */
export interface TokenMaintenanceService {
	cleanupExpiredTokens(): Promise<CleanupResult | null>
}

/**
 * Service for the self-service password-reset flow (unauthenticated): request a reset by email
 * and complete it with a token. Designed as a focused collaborator alongside AuthService.
 */
export interface PasswordResetService {
	/**
	 * Initiates a reset by email. Resolves silently for unknown/inactive accounts (no user
	 * enumeration); only active users receive a reset-link email.
	 */
	requestPasswordReset(email: string): Promise<void>

	/**
	 * Completes a reset with the raw token + new password.
	 * @throws AuthError RESET_TOKEN_INVALID when the token is missing/expired/used or the user is inactive
	 */
	resetPassword(token: string, newPassword: string): Promise<void>
}
