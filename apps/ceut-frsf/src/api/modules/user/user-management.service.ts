import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { CreateUserResponse } from '@contracts/user/user.types'
import { logger } from '@resetshop/util'
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
	 * Updates an existing user's details and/or role assignments.
	 *
	 * @param id - The user's primary key
	 * @param params - Fields to update
	 * @param actorId - ID of the user performing the action
	 * @returns Updated user with roles
	 * @throws Error if user not found
	 * @throws Error if email conflicts with existing user
	 */
	public async updateUser(id: number, params: UpdateUserParams, actorId: number): Promise<ManagedUserData> {
		const existingUser = await this.userManagementRepository.findByIdWithRoles(id)
		if (!existingUser) {
			throw userManagementErrors.notFound(id)
		}

		// Prevent an admin from removing their own admin role (self-lockout). Mirrors the Edit Roles
		// drawer's UI lock as a defense-in-depth backend guard.
		if (id === actorId && params.roleIds !== undefined) {
			const adminRole = existingUser.roles.find((role) => role.code === ADMIN_ROLE_CODE)
			if (adminRole && !params.roleIds.includes(adminRole.id)) {
				throw userManagementErrors.selfAdminRemoval()
			}
		}

		// Check email uniqueness if changing email
		if (params.email !== undefined && params.email !== existingUser.email) {
			const emailUser = await this.userManagementRepository.findByEmail(params.email)
			if (emailUser) {
				throw userManagementErrors.emailExists(params.email)
			}
		}

		// Update profile fields only when provided (avoids a spurious profile-history entry on a roles-only edit).
		if (params.email !== undefined || params.firstName !== undefined || params.lastName !== undefined) {
			await this.userManagementRepository.update(id, params, actorId)
		}

		// Replace the user's roles when a set is provided (full-set replace; the repo records only the
		// added/removed roles in the audit history). The profile fields (email/first/last name) above and
		// the role set here are persisted in separate transactions, so a combined edit is not atomic. That
		// is acceptable because each edit surface sends only profile changes or only role changes, never
		// both — a single atomic payload would only be needed if one surface edited both at once.
		if (params.roleIds !== undefined) {
			await this.userRoleRepository.replaceUserRoles(id, params.roleIds, actorId)
		}

		const updatedUser = await this.userManagementRepository.findByIdWithRoles(id)
		if (!updatedUser) {
			throw userManagementErrors.notFound(id)
		}
		return updatedUser
	}

	/**
	 * Updates a user's account status with state machine enforcement.
	 * Prevents self-lockout and invalid transitions.
	 *
	 * @param id - The user's primary key
	 * @param params - Status change parameters (includes changedBy for audit + self-lockout check)
	 * @returns Updated user with roles
	 * @throws Error if self-lockout or invalid transition
	 */
	public async updateUserStatus(id: number, params: UpdateUserStatusParams): Promise<ManagedUserData> {
		if (id === params.changedBy) {
			throw userManagementErrors.selfLockout()
		}

		const existingUser = await this.userManagementRepository.findByIdWithRoles(id)
		if (!existingUser) {
			throw userManagementErrors.notFound(id)
		}

		if (!this.isValidTransition(existingUser.status, params.status)) {
			throw userManagementErrors.invalidTransition(existingUser.status, params.status)
		}

		const updatedUser = await this.userManagementRepository.updateStatus(id, params)
		if (!updatedUser) {
			throw userManagementErrors.notFound(id)
		}
		return updatedUser
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

	private isValidTransition(from: UserStatus, to: UserStatus): boolean {
		// DELETED intentionally omitted — no transitions out of a terminal deleted state
		const allowed: Partial<Record<UserStatus, UserStatus[]>> = {
			[UserStatus.ACTIVE]: [UserStatus.DISABLED],
			[UserStatus.DISABLED]: [UserStatus.ACTIVE],
		}
		return allowed[from]?.includes(to) ?? false
	}
}
