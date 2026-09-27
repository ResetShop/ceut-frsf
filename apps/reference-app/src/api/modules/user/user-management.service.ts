import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { CreateUserResponse } from '@contracts/user/user.types'
import { logger } from '@resetshop/util'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import type { PaginatedResponse, PaginationParams } from '../../interfaces'
import type { EmailService } from '../../services/email/interfaces'
import { buildResetPasswordEmail } from '../../services/email/reset-password-email.builder'
import { buildWelcomeEmail } from '../../services/email/welcome-email.builder'
import type { AuthenticationRepository } from '../auth/interfaces'
import type {
	CreateUserParams,
	ManagedUserData,
	UpdateUserParams,
	UpdateUserStatusParams,
	UserManagementRepository,
	UserRoleRepository,
	UserUpdateResult,
} from './interfaces'

export const USER_MANAGEMENT_ERRORS = {
	NOT_FOUND: 'User not found',
	EMAIL_EXISTS: 'A user with this email already exists',
	SELF_LOCKOUT: 'Cannot change status of your own account',
	SELF_ADMIN_REMOVAL: 'Cannot remove your own admin role',
	INVALID_TRANSITION: 'Invalid status transition',
} as const

/**
 * Error factory functions that include entity IDs for better debugging.
 * The error messages start with the base error constant for easy matching in tests.
 */
export const userManagementErrors = {
	notFound: (id: number) => new Error(`${USER_MANAGEMENT_ERRORS.NOT_FOUND} (id: ${id})`),
	emailExists: (email: string) => new Error(`${USER_MANAGEMENT_ERRORS.EMAIL_EXISTS} (email: ${email})`),
	selfLockout: () => new Error(USER_MANAGEMENT_ERRORS.SELF_LOCKOUT),
	selfAdminRemoval: () => new Error(USER_MANAGEMENT_ERRORS.SELF_ADMIN_REMOVAL),
	invalidTransition: (from: string, to: string) =>
		new Error(`${USER_MANAGEMENT_ERRORS.INVALID_TRANSITION}: ${from} -> ${to}`),
}

interface UserManagementServiceDeps {
	userManagementRepository: UserManagementRepository
	userRoleRepository: UserRoleRepository
	authRepository: AuthenticationRepository
	emailService: EmailService
	generatePassword: () => Promise<string>
	hashPassword: (plain: string) => Promise<string>
}

/**
 * Service for user management CRUD operations.
 * Handles user listing, creation, updates, soft deletion, and role assignment.
 * Enforces business rules like unique emails and self-lockout prevention.
 */
export class UserManagementService {
	private userManagementRepository: UserManagementRepository
	private userRoleRepository: UserRoleRepository
	private authRepository: AuthenticationRepository
	private emailService: EmailService
	private generatePassword: () => Promise<string>
	private hashPassword: (plain: string) => Promise<string>

	constructor({
		userManagementRepository,
		userRoleRepository,
		authRepository,
		emailService,
		generatePassword,
		hashPassword,
	}: UserManagementServiceDeps) {
		this.userManagementRepository = userManagementRepository
		this.userRoleRepository = userRoleRepository
		this.authRepository = authRepository
		this.emailService = emailService
		this.generatePassword = generatePassword
		this.hashPassword = hashPassword
	}

	/**
	 * Lists all non-deleted users with pagination and optional search.
	 *
	 * @param pagination - Optional pagination parameters (offset, limit)
	 * @param search - Optional search term for email, first name, or last name
	 * @returns Paginated response containing users with roles
	 */
	public async getAllUsers(
		pagination?: PaginationParams,
		search?: string,
	): Promise<PaginatedResponse<ManagedUserData>> {
		return this.userManagementRepository.findAll(pagination, search)
	}

	/**
	 * Retrieves a user by ID with their assigned roles.
	 *
	 * @param id - The user's primary key
	 * @returns User data with roles
	 * @throws Error if user not found
	 */
	public async getUser(id: number): Promise<ManagedUserData> {
		const userData = await this.userManagementRepository.findByIdWithRoles(id)
		if (!userData) {
			throw userManagementErrors.notFound(id)
		}
		return userData
	}

	/**
	 * Creates a new user with optional role assignments.
	 * Auto-generates a passphrase, hashes it, stores with mustChangePassword flag,
	 * and sends a welcome email with the temporary password (failure-tolerant).
	 *
	 * @param params - User creation parameters (email, firstName, lastName, roleIds, mustChangePassword)
	 * @param actorId - ID of the user performing the action
	 * @returns The newly created user with roles and passwordEmailSent flag
	 * @throws Error if email already exists
	 */
	public async createUser(params: CreateUserParams, actorId: number): Promise<CreateUserResponse> {
		const existingUser = await this.userManagementRepository.findByEmail(params.email)
		if (existingUser) {
			throw userManagementErrors.emailExists(params.email)
		}

		const plainPassword = await this.generatePassword()
		const passwordHash = await this.hashPassword(plainPassword)
		const mustChangePassword = params.mustChangePassword ?? true
		const roleIds = [...new Set(params.roleIds ?? [])]

		const createdUser = await this.userManagementRepository.runInTransaction(async (tx) => {
			const newUser = await this.userManagementRepository.create(
				{ email: params.email, firstName: params.firstName, lastName: params.lastName },
				tx,
			)
			await this.authRepository.createInitialPassword({ userId: newUser.id, passwordHash, mustChangePassword }, tx)
			if (roleIds.length > 0) {
				await this.userRoleRepository.replaceUserRoles(newUser.id, roleIds, actorId, tx)
			}
			return newUser
		})

		// Roles are written by the user-role context inside the transaction above; the identity
		// insert returns an empty roles array, so re-read when roles were assigned (mirrors updateUser).
		const createdWithRoles =
			roleIds.length > 0
				? ((await this.userManagementRepository.findByIdWithRoles(createdUser.id)) ?? createdUser)
				: createdUser

		const passwordEmailSent = await this.sendWelcomeEmail(
			params.email,
			params.firstName,
			plainPassword,
			mustChangePassword,
		)

		return { ...createdWithRoles, passwordEmailSent }
	}

	private async sendWelcomeEmail(
		email: string,
		firstName: string,
		password: string,
		mustChangePassword: boolean,
	): Promise<boolean> {
		try {
			const emailContent = buildWelcomeEmail({ firstName, email, password, mustChangePassword })
			await this.emailService.send({ to: email, ...emailContent })
			return true
		} catch (error: unknown) {
			logger.error('UserManagementService', 'Welcome email failed', error)
			return false
		}
	}

	/**
	 * Updates an existing user's profile, role assignments, and/or account status in one transaction.
	 *
	 * Each concern keeps its own context-owned write — profile via `update` (profile history), roles via
	 * `replaceUserRoles` (role-history diff), status via `updateStatus` (status history) — composed into a
	 * single `runInTransaction`, so a failure in any of them rolls back the others. Every guard runs before
	 * the first write. A `status` equal to the current one is a no-op, keeping the PATCH idempotent.
	 *
	 * @param id - The user's primary key
	 * @param params - Fields to update
	 * @param actorId - ID of the user performing the action
	 * @returns The updated user with roles, and the pre-update snapshot the guards ran against
	 * @throws Error if user not found
	 * @throws Error if email conflicts with existing user
	 * @throws Error if the actor removes their own admin role, changes their own status, or the transition is invalid
	 */
	public async updateUser(id: number, params: UpdateUserParams, actorId: number): Promise<UserUpdateResult> {
		const existingUser = await this.userManagementRepository.findByIdWithRoles(id)
		if (!existingUser) {
			throw userManagementErrors.notFound(id)
		}

		const statusChange = params.status !== undefined && params.status !== existingUser.status ? params.status : null
		this.assertNoSelfAdminRemoval(existingUser, params.roleIds, actorId)
		await this.assertEmailAvailable(existingUser, params.email)
		if (statusChange) {
			this.assertStatusChangeAllowed(existingUser, statusChange, actorId)
		}

		// Profile history is written only when a profile field is provided (no spurious entry on a roles-only edit).
		const writesProfile = params.email !== undefined || params.firstName !== undefined || params.lastName !== undefined
		if (writesProfile || params.roleIds !== undefined || statusChange) {
			await this.userManagementRepository.runInTransaction(async (tx) => {
				if (writesProfile) {
					await this.userManagementRepository.update(id, params, actorId, tx)
				}
				if (params.roleIds !== undefined) {
					await this.userRoleRepository.replaceUserRoles(id, params.roleIds, actorId, tx)
				}
				if (statusChange) {
					await this.writeStatusChange(id, { status: statusChange, changedBy: actorId }, tx)
				}
			})
		}

		return { user: await this.getUser(id), previous: existingUser }
	}

	/**
	 * Updates a user's account status with state machine enforcement.
	 * Prevents self-lockout and invalid transitions. Shares its guard and write with `updateUser`.
	 *
	 * @param id - The user's primary key
	 * @param params - Status change parameters (includes changedBy for audit + self-lockout check)
	 * @returns The updated user with roles, and the pre-update snapshot the guards ran against
	 * @throws Error if self-lockout or invalid transition
	 */
	public async updateUserStatus(id: number, params: UpdateUserStatusParams): Promise<UserUpdateResult> {
		// Fast path: a status request always targets a status change, so a self-targeted request is rejected
		// before the user lookup. assertStatusChangeAllowed repeats this check because it is also the guard
		// for updateUser, where the self-check only applies once the requested status differs from the current one.
		if (id === params.changedBy) {
			throw userManagementErrors.selfLockout()
		}

		const existingUser = await this.getUser(id)
		this.assertStatusChangeAllowed(existingUser, params.status, params.changedBy)
		return { user: await this.writeStatusChange(id, params), previous: existingUser }
	}

	/**
	 * Soft deletes a user by setting status to `deleted`.
	 *
	 * @param id - The user's primary key
	 * @param currentUserId - The ID of the admin performing the deletion
	 * @throws Error if self-lockout or user not found
	 */
	public async deleteUser(id: number, currentUserId: number): Promise<void> {
		if (id === currentUserId) {
			throw userManagementErrors.selfLockout()
		}
		const deleted = await this.userManagementRepository.softDelete(id, currentUserId)
		if (!deleted) {
			throw userManagementErrors.notFound(id)
		}
	}

	/**
	 * Admin-initiated password reset. Generates a new temporary password, hashes
	 * and persists it with `mustChangePassword: true`, and emails it to the user.
	 * The generated password is never returned to the caller.
	 *
	 * @param id - The target user's primary key
	 * @param currentUserId - The ID of the admin performing the reset (for self-action prevention)
	 * @returns A confirmation message and a `sendResetEmail` thunk the caller dispatches best-effort
	 *   AFTER the response (so the response/toast isn't blocked on SMTP). The generated password is
	 *   captured in the closure and never returned.
	 * @throws Error if the admin targets their own account
	 * @throws Error if the user is not found
	 */
	public async resetPassword(
		id: number,
		currentUserId: number,
	): Promise<{ message: string; sendResetEmail: () => Promise<void> }> {
		if (id === currentUserId) {
			throw userManagementErrors.selfLockout()
		}

		const userData = await this.userManagementRepository.findByIdWithRoles(id)
		if (!userData) {
			throw userManagementErrors.notFound(id)
		}

		const plainPassword = await this.generatePassword()
		const passwordHash = await this.hashPassword(plainPassword)
		await this.authRepository.setPassword(id, passwordHash, true)

		// The password is now reset — that is the completed action. Hand the email back as a thunk so the
		// controller can dispatch it AFTER the response (best-effort, via deferAfterResponse).
		return {
			message: 'Password reset successfully',
			sendResetEmail: () => this.sendResetPasswordEmail(userData.email, userData.firstName, plainPassword),
		}
	}

	private async sendResetPasswordEmail(email: string, firstName: string, password: string): Promise<void> {
		const emailContent = buildResetPasswordEmail({ firstName, email, password })
		await this.emailService.send({ to: email, ...emailContent })
	}

	/** An admin may not drop their own admin role — the backend counterpart of the edit drawer's UI lock. */
	private assertNoSelfAdminRemoval(
		existingUser: ManagedUserData,
		roleIds: number[] | undefined,
		actorId: number,
	): void {
		if (existingUser.id !== actorId || roleIds === undefined) {
			return
		}
		const adminRole = existingUser.roles.find((role) => role.code === ADMIN_ROLE_CODE)
		if (adminRole && !roleIds.includes(adminRole.id)) {
			throw userManagementErrors.selfAdminRemoval()
		}
	}

	private async assertEmailAvailable(existingUser: ManagedUserData, email: string | undefined): Promise<void> {
		if (email === undefined || email === existingUser.email) {
			return
		}
		const emailUser = await this.userManagementRepository.findByEmail(email)
		if (emailUser) {
			throw userManagementErrors.emailExists(email)
		}
	}

	/** Status-change invariants shared by every entry point: no self-lockout, only allowed transitions. */
	private assertStatusChangeAllowed(existingUser: ManagedUserData, status: UserStatus, actorId: number): void {
		if (existingUser.id === actorId) {
			throw userManagementErrors.selfLockout()
		}
		if (!this.isValidTransition(existingUser.status, status)) {
			throw userManagementErrors.invalidTransition(existingUser.status, status)
		}
	}

	private async writeStatusChange(
		id: number,
		params: UpdateUserStatusParams,
		tx?: DrizzleTransaction,
	): Promise<ManagedUserData> {
		const updatedUser = await this.userManagementRepository.updateStatus(id, params, tx)
		if (!updatedUser) {
			throw userManagementErrors.notFound(id)
		}
		return updatedUser
	}

	private isValidTransition(from: UserStatus, to: UserStatus): boolean {
		// DELETED intentionally omitted — no transitions out of a terminal deleted state
		const allowed: Partial<Record<UserStatus, UserStatus[]>> = {
			[UserStatus.ACTIVE]: [UserStatus.DISABLED],
			[UserStatus.DISABLED]: [UserStatus.ACTIVE],
		}
		return allowed[from]?.includes(to) ?? false
	}
}
