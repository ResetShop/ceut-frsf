import { parseDurationToMs } from '@resetshop/util'
import { DEFAULT_LOCKOUT_DURATION, DEFAULT_MAX_FAILED_ATTEMPTS } from '../../constants/auth.constants'
import {
	type AuthenticationData,
	type AuthenticationRepository,
	type CreateInitialPasswordParams,
	type IncrementAttemptsResult,
} from './interfaces'

interface MockAuthRecord {
	passwordHash: string
	failedLoginAttempts?: number
	lockedUntil?: Date | null
	mustChangePassword?: boolean
}

export class InMemoryAuthenticationRepository implements AuthenticationRepository {
	private authRecords: Map<number, MockAuthRecord> = new Map()
	private nextId = 1
	private readonly maxAttempts: number
	private readonly lockDuration: number

	// Track method calls for testing
	public incrementedUsers: number[] = []
	public lockedUsers: Array<{ userId: number; lockedUntil: Date }> = []
	public resetUsers: number[] = []
	public createdPasswords: CreateInitialPasswordParams[] = []
	public setPasswordCalls: Array<{ userId: number; passwordHash: string; mustChangePassword: boolean }> = []

	constructor(options?: { maxFailedAttempts?: number; lockoutDuration?: string }) {
		this.maxAttempts = options?.maxFailedAttempts ?? DEFAULT_MAX_FAILED_ATTEMPTS
		this.lockDuration = parseDurationToMs(options?.lockoutDuration ?? DEFAULT_LOCKOUT_DURATION)
	}

	/**
	 * Add an authentication record for a user.
	 * @param userId User ID
	 * @param data Authentication data
	 */
	public addAuthRecord(userId: number, data: MockAuthRecord): void {
		this.authRecords.set(userId, data)
	}

	/**
	 * Clear all authentication records and tracking data.
	 */
	public clear(): void {
		this.authRecords.clear()
		this.incrementedUsers = []
		this.lockedUsers = []
		this.resetUsers = []
		this.createdPasswords = []
		this.setPasswordCalls = []
		this.nextId = 1
	}

	public async findByUserId(userId: number): Promise<AuthenticationData | null> {
		const record = this.authRecords.get(userId)
		if (!record) {
			return null
		}
		return {
			id: this.nextId++,
			userId,
			passwordHash: record.passwordHash,
			failedLoginAttempts: record.failedLoginAttempts ?? 0,
			lockedUntil: record.lockedUntil ?? null,
			mustChangePassword: record.mustChangePassword ?? false,
		}
	}

	public async incrementFailedAttempts(userId: number): Promise<number> {
		this.incrementedUsers.push(userId)
		const record = this.authRecords.get(userId)
		if (record) {
			record.failedLoginAttempts = (record.failedLoginAttempts ?? 0) + 1
			return record.failedLoginAttempts
		}
		return 1
	}

	public async lockAccount(userId: number, lockedUntil: Date): Promise<void> {
		this.lockedUsers.push({ userId, lockedUntil })
		const record = this.authRecords.get(userId)
		if (record) {
			record.lockedUntil = lockedUntil
		}
	}

	public async resetFailedAttempts(userId: number): Promise<void> {
		this.resetUsers.push(userId)
		const record = this.authRecords.get(userId)
		if (record) {
			record.failedLoginAttempts = 0
			record.lockedUntil = null
		}
	}

	public async incrementAndLockIfNeeded(userId: number): Promise<IncrementAttemptsResult> {
		const maxAttempts = this.maxAttempts
		const lockDuration = this.lockDuration

		this.incrementedUsers.push(userId)
		const record = this.authRecords.get(userId)

		if (!record) {
			return {
				failedAttempts: 1,
				wasLocked: false,
			}
		}

		record.failedLoginAttempts = (record.failedLoginAttempts ?? 0) + 1
		const newAttemptCount = record.failedLoginAttempts

		if (newAttemptCount >= maxAttempts) {
			const lockedUntil = new Date(Date.now() + lockDuration)
			record.lockedUntil = lockedUntil
			this.lockedUsers.push({ userId, lockedUntil })

			return {
				failedAttempts: newAttemptCount,
				wasLocked: true,
				lockedUntil,
			}
		}

		return {
			failedAttempts: newAttemptCount,
			wasLocked: false,
		}
	}

	public async createInitialPassword(params: CreateInitialPasswordParams): Promise<void> {
		this.createdPasswords.push(params)
		this.authRecords.set(params.userId, {
			passwordHash: params.passwordHash,
			mustChangePassword: params.mustChangePassword,
		})
	}

	public async setPassword(userId: number, passwordHash: string, mustChangePassword: boolean): Promise<boolean> {
		this.setPasswordCalls.push({ userId, passwordHash, mustChangePassword })
		const record = this.authRecords.get(userId)
		if (!record) return false
		record.passwordHash = passwordHash
		record.mustChangePassword = mustChangePassword
		return true
	}
}
