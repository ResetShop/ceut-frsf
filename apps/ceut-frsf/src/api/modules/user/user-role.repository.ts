import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { permission } from '@schema/permission'
import { role, rolePermission } from '@schema/role'
import { userRole } from '@schema/user'
import { UserRoleHistoryAction, userRoleHistory } from '@schema/user-role-history'
import { and, count, eq, inArray } from 'drizzle-orm'
import { BaseRepository } from '../../helpers/base.repository'
import type { DrizzleTransaction } from '../../helpers/drizzle-postgres-connector'
import { PaginatedResponse, PaginationParams } from '../../interfaces'
import type { PermissionData, RoleData, RoleWithPermissions } from '../access/role/interfaces'
import type { UserRoleRepository } from './interfaces'
import { USER_ROLE_ERRORS, userRoleErrors } from './user-role.errors'

/**
 * Repository for user-role relationship database operations.
 * Handles role assignments, permission aggregation, and role membership checks.
 */
export class DrizzleUserRoleRepository extends BaseRepository implements UserRoleRepository {
	/**
	 * Retrieves all roles assigned to a user with pagination.
	 *
	 * @param userId - The user's primary key
	 * @param pagination - Optional pagination parameters
	 * @param pagination.offset - Number of records to skip (default: 0)
	 * @param pagination.limit - Maximum records to return (default: 10)
	 * @returns Paginated response containing roles and metadata
	 */
	public async findRolesForUser(userId: number, pagination?: PaginationParams): Promise<PaginatedResponse<RoleData>> {
		const limit = pagination?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = pagination?.offset ?? QUERY_DEFAULTS.OFFSET

		const [data, totalResult] = await Promise.all([
			this.db
				.select({
					id: role.id,
					name: role.name,
					code: role.code,
					description: role.description,
					removable: role.removable,
					createdAt: role.createdAt,
					updatedAt: role.updatedAt,
				})
				.from(userRole)
				.innerJoin(role, eq(userRole.roleId, role.id))
				.where(eq(userRole.userId, userId))
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(userRole).where(eq(userRole.userId, userId)),
		])

		return {
			data,
			total: totalResult[0].count,
			offset,
			limit,
		}
	}

	/**
	 * Retrieves all roles assigned to a user with their permissions nested.
	 * Uses Drizzle's relational query API for cleaner data fetching.
	 *
	 * @param userId - The user's primary key
	 * @returns Array of roles with nested permissions
	 */
	public async findRolesWithPermissionsForUser(userId: number): Promise<RoleWithPermissions[]> {
		const userRolesWithData = await this.db.query.userRole.findMany({
			where: eq(userRole.userId, userId),
			with: {
				role: {
					with: {
						permissions: {
							with: {
								permission: true,
							},
						},
					},
				},
			},
		})

		return userRolesWithData.map((ur) => ({
			id: ur.role.id,
			code: ur.role.code,
			name: ur.role.name,
			description: ur.role.description,
			removable: ur.role.removable,
			createdAt: ur.role.createdAt,
			updatedAt: ur.role.updatedAt,
			permissions: ur.role.permissions.map((rp) => ({
				id: rp.permission.id,
				name: rp.permission.name,
				description: rp.permission.description,
				module: rp.permission.module,
				resource: rp.permission.resource,
				action: rp.permission.action,
			})),
		}))
	}

	/**
	 * Retrieves all permissions for a user aggregated from all their assigned roles.
	 * Returns distinct permissions to avoid duplicates when multiple roles share permissions.
	 *
	 * @param userId - The user's primary key
	 * @returns Array of unique permissions across all user's roles
	 */
	public async findPermissionsForUser(userId: number): Promise<PermissionData[]> {
		const result = await this.db
			.selectDistinct({
				id: permission.id,
				name: permission.name,
				description: permission.description,
				module: permission.module,
				resource: permission.resource,
				action: permission.action,
			})
			.from(userRole)
			.innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
			.innerJoin(permission, eq(rolePermission.permissionId, permission.id))
			.where(eq(userRole.userId, userId))

		return result
	}

	/**
	 * Assigns a role to a user.
	 * Uses onConflictDoNothing to handle duplicate assignments gracefully.
	 *
	 * @param userId - The user's primary key
	 * @param roleId - The role's primary key to assign
	 * @returns true if the role was assigned, false if already assigned
	 */
	public async assignRoleToUser(userId: number, roleId: number, actorId: number): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const result = await tx
				.insert(userRole)
				.values({ userId, roleId })
				.onConflictDoNothing()
				.returning({ id: userRole.id })

			if (result.length > 0) {
				await tx.insert(userRoleHistory).values({
					userId,
					roleId,
					action: UserRoleHistoryAction.ASSIGNED,
					changedBy: actorId,
					changedAt: new Date(),
				})
			}

			return result.length > 0
		})
	}

	/**
	 * Removes a role assignment from a user.
	 *
	 * @param userId - The user's primary key
	 * @param roleId - The role's primary key to remove
	 * @returns true if the role was removed, false if it wasn't assigned
	 */
	public async removeRoleFromUser(userId: number, roleId: number, actorId: number): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const result = await tx
				.delete(userRole)
				.where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)))
				.returning({ id: userRole.id })

			if (result.length > 0) {
				await tx.insert(userRoleHistory).values({
					userId,
					roleId,
					action: UserRoleHistoryAction.REMOVED,
					changedBy: actorId,
					changedAt: new Date(),
				})
			}

			return result.length > 0
		})
	}

	/**
	 * Checks if a user has a specific role assigned.
	 *
	 * @param userId - The user's primary key
	 * @param roleId - The role's primary key to check
	 * @returns true if the user has the role, false otherwise
	 */
	public async findUserHasRole(userId: number, roleId: number): Promise<boolean> {
		const result = await this.db
			.select({ id: userRole.id })
			.from(userRole)
			.where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)))
			.limit(1)

		return result.length > 0
	}

	/**
	 * Replaces all role assignments for a user.
	 * Validates that all role IDs exist before replacing.
	 * Removes existing roles and assigns the new ones.
	 *
	 * @param userId - The user's primary key
	 * @param roleIds - Array of role IDs to assign (replaces existing)
	 * @param actorId - ID of the user performing the change (for audit history)
	 * @param tx - Optional transaction handle; when supplied the writes join the caller's
	 *   transaction (e.g. user creation), otherwise a new transaction is opened
	 * @throws Error if any role ID does not exist
	 */
	public async replaceUserRoles(
		userId: number,
		roleIds: number[],
		actorId: number,
		tx?: DrizzleTransaction,
	): Promise<void> {
		if (tx) {
			await this.replaceUserRolesWithin(tx, userId, roleIds, actorId)
			return
		}
		await this.db.transaction((trx) => this.replaceUserRolesWithin(trx, userId, roleIds, actorId))
	}

	private async replaceUserRolesWithin(
		tx: DrizzleTransaction,
		userId: number,
		roleIds: number[],
		actorId: number,
	): Promise<void> {
		await this.assertRolesAssignable(tx, userId, roleIds)

		// Snapshot existing role IDs for the audit diff before replacing
		const currentAssignments = await tx
			.select({ roleId: userRole.roleId })
			.from(userRole)
			.where(eq(userRole.userId, userId))
		const oldRoleIds = new Set(currentAssignments.map((r) => r.roleId))
		const newRoleIds = new Set(roleIds)

		await tx.delete(userRole).where(eq(userRole.userId, userId))
		if (roleIds.length > 0) {
			const values = roleIds.map((roleId) => ({ userId, roleId }))
			await tx.insert(userRole).values(values)
		}

		await this.writeRoleHistoryDiff(tx, userId, oldRoleIds, newRoleIds, actorId)
	}

	/**
	 * Guards a role replacement: every supplied role must exist, and no currently-assigned
	 * non-removable role may be dropped.
	 * @throws Error if any role ID does not exist, or a non-removable role would be removed
	 */
	private async assertRolesAssignable(tx: DrizzleTransaction, userId: number, roleIds: number[]): Promise<void> {
		if (roleIds.length > 0) {
			const existingRoles = await tx.select({ id: role.id }).from(role).where(inArray(role.id, roleIds))
			const existingIds = new Set(existingRoles.map((r) => r.id))
			const missingIds = roleIds.filter((id) => !existingIds.has(id))
			if (missingIds.length > 0) {
				throw new Error(`${USER_ROLE_ERRORS.ROLES_NOT_FOUND}: ${missingIds.join(', ')}`)
			}
		}

		const nonRemovableResult = await tx
			.select({ roleId: userRole.roleId })
			.from(userRole)
			.innerJoin(role, eq(userRole.roleId, role.id))
			.where(and(eq(userRole.userId, userId), eq(role.removable, false)))
		const roleIdSet = new Set(roleIds)
		const missingNonRemovable = nonRemovableResult.map((r) => r.roleId).filter((id) => !roleIdSet.has(id))
		if (missingNonRemovable.length > 0) {
			throw userRoleErrors.nonRemovableRoles(missingNonRemovable)
		}
	}

	/** Writes ASSIGNED/REMOVED history rows for the difference between the old and new role sets. */
	private async writeRoleHistoryDiff(
		tx: DrizzleTransaction,
		userId: number,
		oldRoleIds: Set<number>,
		newRoleIds: Set<number>,
		actorId: number,
	): Promise<void> {
		const now = new Date()
		const historyRows: Array<{ userId: number; roleId: number; action: string; changedBy: number; changedAt: Date }> =
			[]

		for (const id of oldRoleIds) {
			if (!newRoleIds.has(id)) {
				historyRows.push({
					userId,
					roleId: id,
					action: UserRoleHistoryAction.REMOVED,
					changedBy: actorId,
					changedAt: now,
				})
			}
		}
		for (const id of newRoleIds) {
			if (!oldRoleIds.has(id)) {
				historyRows.push({
					userId,
					roleId: id,
					action: UserRoleHistoryAction.ASSIGNED,
					changedBy: actorId,
					changedAt: now,
				})
			}
		}

		if (historyRows.length > 0) {
			await tx.insert(userRoleHistory).values(historyRows)
		}
	}
}
