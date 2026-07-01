import { AuthError, getInternalErrorMessage, InternalAuthErrorCode } from '@contracts/auth/auth.errors'
import { UserStatus } from '@contracts/user/user.constants'
import { logger } from '@resetshop/util'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import { type UserData } from '../user/interfaces'
import {
	type AuthenticationData,
	type AuthenticationRepository,
	type AuthPasswordService as IAuthPasswordService,
} from './interfaces'

interface AuthPasswordServiceDeps {
	authRepository: AuthenticationRepository
	verifyPassword: (plain: string, hash: string) => Promise<boolean>
	hashPassword: (plain: string) => Promise<string>
}

/**
 * Service owning password-credential verification and failed-login tracking.
 *
 * Extracted from `AuthService` so the core authentication orchestrator stays free of
 * password-mechanism details, and so future non-password mechanisms (OAuth, SSO, passkeys)
 * can be added as sibling collaborators without changing `AuthService`.
 */
export class AuthPasswordService implements IAuthPasswordService {
	private readonly authRepository: AuthenticationRepository
	private readonly verifyPassword: (plain: string, hash: string) => Promise<boolean>
	private readonly hashPassword: (plain: string) => Promise<string>

	/** Memoized real bcrypt hash used to equalize timing for unknown accounts (see validateCredentials). */
	private dummyHashPromise: Promise<string> | undefined

	constructor({ authRepository, verifyPassword, hashPassword }: AuthPasswordServiceDeps) {
		this.authRepository = authRepository
		this.verifyPassword = verifyPassword
		this.hashPassword = hashPassword
	}

	/**
	 * Lazily produces — and caches — a genuine bcrypt hash of a throwaway value, hashed through
	 * the same `hashPassword` factory as real credentials so its bcrypt cost matches production
	 * (and the integration BCRYPT_COST override). The result is never compared for equality; only
	 * the cost of running `verifyPassword` against a *valid* hash matters. Computed at most once.
	 *
	 * This replaces a hand-written, malformed hash literal: a malformed hash lets bcryptjs
	 * short-circuit instead of running the key-derivation, silently reopening the timing oracle.
	 */
	private getDummyHash(): Promise<string> {
		// A value that is never a usable credential; only the bcrypt CPU cost is significant.
		const timingSafetySentinel = 'unmatchable-dummy-password-for-timing-safety'
		return (this.dummyHashPromise ??= this.hashPassword(timingSafetySentinel))
	}

	/**
	 * Validates user credentials with timing-safe comparison.
	 *
	 * SECURITY: Accepts nullable parameters to maintain timing-safety. Even when user
	 * or authRecord is null (invalid email), we MUST perform the expensive bcrypt
	 * password comparison against a real hash (see getDummyHash). Skipping bcrypt for
	 * invalid cases would create a timing vulnerability: valid emails take ~200ms
	 * (DB + bcrypt), invalid emails take ~50ms (DB only), allowing attackers to
	 * enumerate valid emails by measuring response times. The cost is intentional and
	 * necessary for security.
	 *
	 * Handles failed login tracking before throwing.
	 *
	 * @param user - User object or null
	 * @param authRecord - Authentication record or null
	 * @param password - Password to verify
	 * @returns Validated user and auth record
	 * @throws AuthError with INVALID_CREDENTIALS code if validation fails
	 */
	public async validateCredentials(
		user: UserData | null,
		authRecord: AuthenticationData | null,
		password: string,
	): Promise<{ user: UserData; authRecord: AuthenticationData }> {
		const hashToCompare = authRecord?.passwordHash ?? (await this.getDummyHash())
		const passwordMatch = await this.verifyPassword(password, hashToCompare)

		if (!user || !authRecord || !passwordMatch || user.status !== UserStatus.ACTIVE) {
			await this.handleFailedLogin(user, authRecord)
			throw new AuthError(InternalAuthErrorCode.INVALID_CREDENTIALS)
		}

		return { user, authRecord }
	}

	/**
	 * Changes an authenticated user's password. Verifies the current password against the stored
	 * hash, then writes the new hash and clears the must-change-password flag. The optional `tx`
	 * lets the caller (AuthService) compose this write with session revocation atomically — a
	 * failed verification throws before any write, so the transaction rolls back untouched.
	 *
	 * @throws AuthError OLD_PASSWORD_MISMATCH when the current password does not match
	 * @throws AuthError AUTH_RECORD_NOT_FOUND when the user has no authentication record
	 */
	public async changePassword(
		userId: number,
		oldPassword: string,
		newPassword: string,
		tx?: DrizzleTransaction,
	): Promise<void> {
		const authRecord = await this.authRepository.findByUserId(userId)
		if (!authRecord) {
			throw new AuthError(InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND)
		}

		const oldPasswordMatches = await this.verifyPassword(oldPassword, authRecord.passwordHash)
		if (!oldPasswordMatches) {
			throw new AuthError(InternalAuthErrorCode.OLD_PASSWORD_MISMATCH)
		}

		const newPasswordHash = await this.hashPassword(newPassword)
		await this.authRepository.setPassword(userId, newPasswordHash, false, tx)
	}

	/**
	 * Returns whether the user must change their password, read fresh from the auth record.
	 * Defaults to false when no record exists — the caller is already authenticated, so a missing
	 * record is a defensive edge rather than an expected state.
	 */
	public async getMustChangePassword(userId: number): Promise<boolean> {
		const authRecord = await this.authRepository.findByUserId(userId)
		return authRecord?.mustChangePassword ?? false
	}

	/**
	 * Handles failed login attempt by tracking failures and locking the account if the threshold is reached.
	 */
	private async handleFailedLogin(user: UserData | null, authRecord: AuthenticationData | null): Promise<void> {
		if (!user || !authRecord) {
			this.logAuthFailure(user, authRecord)
			return
		}

		const result = await this.authRepository.incrementAndLockIfNeeded(user.id)

		if (result.wasLocked && result.lockedUntil) {
			logger.security('account_locked', {
				userId: user.id,
				failedAttempts: result.failedAttempts,
				lockedUntil: result.lockedUntil.toISOString(),
			})
		}

		this.logAuthFailure(user, authRecord)
	}

	/**
	 * Logs authentication failure reasons for debugging.
	 */
	private logAuthFailure(user: UserData | null, authRecord: AuthenticationData | null): void {
		if (!user) {
			logger.error('AuthPasswordService', getInternalErrorMessage(InternalAuthErrorCode.USER_NOT_FOUND))
		} else if (!authRecord) {
			logger.error('AuthPasswordService', getInternalErrorMessage(InternalAuthErrorCode.AUTH_RECORD_NOT_FOUND))
		} else if (user.status === UserStatus.DELETED) {
			logger.error('AuthPasswordService', getInternalErrorMessage(InternalAuthErrorCode.ACCOUNT_DELETED))
		} else if (user.status === UserStatus.DISABLED) {
			logger.error('AuthPasswordService', getInternalErrorMessage(InternalAuthErrorCode.ACCOUNT_DISABLED))
		} else {
			logger.error('AuthPasswordService', getInternalErrorMessage(InternalAuthErrorCode.INVALID_CREDENTIALS))
		}
	}
}
