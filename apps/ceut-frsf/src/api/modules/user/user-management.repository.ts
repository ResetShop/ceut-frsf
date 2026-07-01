import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { UserStatus } from '@contracts/user/user.constants'
import { role } from '@schema/role'
import { user, userRole } from '@schema/user'
import { userProfileHistory } from '@schema/user-profile-history'
import { userStatusHistory } from '@schema/user-status-history'
import { and, count, eq, ilike, inArray, ne, or } from 'drizzle-orm'
import { BaseRepository } from '../../helpers/base.repository'
import type { DrizzleTransaction, QueryExecutor } from '../../helpers/drizzle-postgres-connector'
import type { PaginatedResponse, PaginationParams } from '../../interfaces'
import type { RoleData } from '../access/role/interfaces'
import type {
	CreateUserIdentityParams,
	ManagedUserData,
	UpdateUserParams,
	UpdateUserStatusParams,
	UserData,
	UserManagementRepository,
} from './interfaces'

// Mirrors UserWithTimestamps but kept file-local per Repository Projection Types convention.
// Drizzle .select() returns this shape; it may diverge from the domain interface over time.
interface UserProjection {
	id: number
	email: string
	firstName: string
	lastName: string
	status: UserStatus
	statusChangedAt: Date | null
	statusChangedBy: number | null
	deletedAt: Date | null
	createdAt: Date | null
	updatedAt: Date | null
}

interface FindByEmailProjection {
	id: number
	email: string
	firstName: string
	lastName: string
	status: UserStatus
}

interface RoleAssignmentProjection {
	userId: number
	roleId: number
	roleName: string
	roleCode: string
	roleDescription: string | null
	roleRemovable: boolean
	roleCreatedAt: Date | null
	roleUpdatedAt: Date | null
}

/**
 * Repository for user management CRUD operations.
 * Handles user listing, creation, updates, and soft deletion.
 */
export class DrizzleUserManagementRepository extends BaseRepository implements UserManagementRepository {
	/**
	 * Retrieves all non-deleted users with pagination and optional search.
	 * Each user includes their assigned roles.
	 *
	 * @param pagination - Optional pagination parameters (offset, limit)
	 * @param search - Optional search term to filter by email, first name, or last name
	 * @returns Paginated response containing users with roles
	 */
	public async findAll(pagination?: PaginationParams, search?: string): Promise<PaginatedResponse<ManagedUserData>> {
		const limit = pagination?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = pagination?.offset ?? QUERY_DEFAULTS.OFFSET

		const baseCondition = ne(user.status, UserStatus.DELETED)

		const whereClause = search
			? and(
					baseCondition,
					or(
						ilike(user.email, `%${search}%`),
						ilike(user.firstName, `%${search}%`),
						ilike(user.lastName, `%${search}%`),
					),
				)
			: baseCondition

		const [users, totalResult] = await Promise.all([
			this.db
				.select({
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					status: user.status,
					statusChangedAt: user.statusChangedAt,
					statusChangedBy: user.statusChangedBy,
					deletedAt: user.deletedAt,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				})
				.from(user)
				.where(whereClause)
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(user).where(whereClause),
		])

		const usersWithRoles = await this.attachRolesToUsers(users, this.db)

		return {
			data: usersWithRoles,
			total: totalResult[0].count,
			offset,
			limit,
		}
	}

	/**
	 * Finds a user by ID with their assigned roles.
	 * Returns null if not found or if the user is deleted.
	 *
	 * @param id - The user's primary key
	 * @returns User data with roles, or null if not found
	 */
	public async findByIdWithRoles(id: number): Promise<ManagedUserData | null> {
		const result = await this.db
			.select({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status,
				statusChangedAt: user.statusChangedAt,
				statusChangedBy: user.statusChangedBy,
				deletedAt: user.deletedAt,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			})
			.from(user)
			.where(and(eq(user.id, id), ne(user.status, UserStatus.DELETED)))
			.limit(1)

		if (result.length === 0) {
			return null
		}

		const usersWithRoles = await this.attachRolesToUsers(result, this.db)
		return usersWithRoles[0]
	}

	/**
	 * Finds a non-deleted user by email.
	 *
	 * @param email - Email address to search for
	 * @returns User data if found, null otherwise
	 */
	public async findByEmail(email: string): Promise<UserData | null> {
		const result: FindByEmailProjection[] = await this.db
			.select({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status,
			})
			.from(user)
			.where(and(eq(user.email, email), ne(user.status, UserStatus.DELETED)))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Inserts a user identity row — and nothing else.
	 * Writes neither credentials (auth context) nor role assignments (user-role context);
	 * the service composes those into the same transaction via `runInTransaction` so a
	 * later failure in any of them rolls back the user insert too. When a `tx` is supplied
	 * the insert joins that transaction. The returned user therefore has an empty `roles`
	 * array; callers re-read with roles after assignments are written.
	 *
	 * @param params - User identity parameters (email, first/last name)
	 * @param tx - Optional transaction handle; falls back to the pooled connection
	 * @returns The newly created user (roles empty until assigned by the user-role context)
	 */
	public async create(params: CreateUserIdentityParams, tx?: DrizzleTransaction): Promise<ManagedUserData> {
		const executor: QueryExecutor = tx ?? this.db

		const userResult = await executor
			.insert(user)
			.values({
				email: params.email,
				firstName: params.firstName,
				lastName: params.lastName,
			})
			.returning({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status,
				statusChangedAt: user.statusChangedAt,
				statusChangedBy: user.statusChangedBy,
				deletedAt: user.deletedAt,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			})

		// No roles are assigned during the identity insert, so this returns an empty roles array;
		// the service re-reads with roles after the role-assignment write commits.
		const [result] = await this.attachRolesToUsers([userResult[0]], executor)
		return result
	}

	/**
	 * Updates an existing user's properties.
	 * Only provided fields are updated.
	 *
	 * @param id - The user's primary key
	 * @param params - Fields to update
	 * @returns Updated user data, or null if not found
	 */
	public async update(id: number, params: UpdateUserParams, actorId: number): Promise<UserData | null> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const updateData: Partial<typeof user.$inferInsert> = { updatedAt: now }

			if (params.email !== undefined) updateData.email = params.email
			if (params.firstName !== undefined) updateData.firstName = params.firstName
			if (params.lastName !== undefined) updateData.lastName = params.lastName

			const result = await tx
				.update(user)
				.set(updateData)
				.where(and(eq(user.id, id), ne(user.status, UserStatus.DELETED)))
				.returning({
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					status: user.status,
				})

			if (result.length === 0) return null

			await tx.insert(userProfileHistory).values({
				userId: id,
				email: result[0].email,
				firstName: result[0].firstName,
				lastName: result[0].lastName,
				changedBy: actorId,
				changedAt: now,
			})

			return result[0]
		})
	}

	/**
	 * Soft deletes a user by setting status to `deleted` and recording the audit trail.
	 *
	 * @param id - The user's primary key
	 * @param changedBy - The ID of the admin performing the deletion
	 * @returns true if the user was deleted, false if not found
	 */
	public async softDelete(id: number, changedBy: number): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const exists = await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1)
			if (exists.length === 0) return false

			const now = new Date()
			const result = await tx
				.update(user)
				.set({
					status: UserStatus.DELETED,
					statusChangedAt: now,
					statusChangedBy: changedBy,
					deletedAt: now,
					updatedAt: now,
				})
				.where(and(eq(user.id, id), ne(user.status, UserStatus.DELETED)))
				.returning({ id: user.id })

			if (result.length > 0) {
				await tx.insert(userStatusHistory).values({
					userId: id,
					status: UserStatus.DELETED,
					changedBy,
					changedAt: now,
				})
			}

			return result.length > 0
		})
	}

	/**
	 * Updates a user's account status with audit trail.
	 * Deleted users cannot be modified.
	 *
	 * @param id - The user's primary key
	 * @param params - Status change parameters including the new status and who changed it
	 * @returns Updated user data with roles, or null if not found or deleted
	 */
	public async updateStatus(id: number, params: UpdateUserStatusParams): Promise<ManagedUserData | null> {
		return this.db.transaction(async (tx) => {
			const exists = await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1)
			if (exists.length === 0) return null

			const now = new Date()
			const result = await tx
				.update(user)
				.set({
					status: params.status,
					statusChangedAt: now,
					statusChangedBy: params.changedBy,
					updatedAt: now,
				})
				.where(and(eq(user.id, id), ne(user.status, UserStatus.DELETED)))
				.returning({
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					status: user.status,
					statusChangedAt: user.statusChangedAt,
					statusChangedBy: user.statusChangedBy,
					deletedAt: user.deletedAt,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				})

			if (result.length === 0) return null

			await tx.insert(userStatusHistory).values({
				userId: id,
				status: params.status,
				changedBy: params.changedBy,
				changedAt: now,
			})

			const [updatedWithRoles] = await this.attachRolesToUsers(result, tx)
			return updatedWithRoles
		})
	}

	/**
	 * Attaches roles to an array of user records.
	 * Fetches all role assignments in a single query for efficiency.
	 * Runs on the supplied executor so it can read rows written earlier in the
	 * same transaction (e.g. the role assignments inserted during `create`).
	 */
	private async attachRolesToUsers(users: UserProjection[], executor: QueryExecutor): Promise<ManagedUserData[]> {
		if (users.length === 0) {
			return []
		}

		const userIds = users.map((u) => u.id)

		const roleAssignments = await executor
			.select({
				userId: userRole.userId,
				roleId: role.id,
				roleName: role.name,
				roleCode: role.code,
				roleDescription: role.description,
				roleRemovable: role.removable,
				roleCreatedAt: role.createdAt,
				roleUpdatedAt: role.updatedAt,
			})
			.from(userRole)
			.innerJoin(role, eq(userRole.roleId, role.id))
			.where(inArray(userRole.userId, userIds))

		const rolesByUserId = this.groupRolesByUserId(roleAssignments)

		return users.map((u) => ({
			...u,
			roles: rolesByUserId.get(u.id) ?? [],
		}))
	}

	/**
	 * Groups role assignment rows into a map keyed by user ID.
	 */
	private groupRolesByUserId(roleAssignments: RoleAssignmentProjection[]): Map<number, RoleData[]> {
		const rolesByUserId = new Map<number, RoleData[]>()
		for (const ra of roleAssignments) {
			const roles = rolesByUserId.get(ra.userId) ?? []
			roles.push({
				id: ra.roleId,
				name: ra.roleName,
				code: ra.roleCode,
				description: ra.roleDescription,
				removable: ra.roleRemovable,
				createdAt: ra.roleCreatedAt,
				updatedAt: ra.roleUpdatedAt,
			})
			rolesByUserId.set(ra.userId, roles)
		}
		return rolesByUserId
	}
}
