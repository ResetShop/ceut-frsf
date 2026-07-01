import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { permission } from '@schema/permission'
import { role, rolePermission } from '@schema/role'
import { RoleHistoryAction, roleHistory } from '@schema/role-history'
import { RolePermissionHistoryAction, rolePermissionHistory } from '@schema/role-permission-history'
import { type SQL, count, eq, ilike, inArray, or } from 'drizzle-orm'
import { BaseRepository } from '../../../helpers/base.repository'
import type { PaginatedResponse, PaginationParams } from '../../../interfaces'
import type {
	CreateRoleParams,
	ListRolesParams,
	PermissionData,
	RoleData,
	RoleRepository,
	UpdateRoleParams,
} from './interfaces'

/**
 * Repository for role-related database operations.
 * Handles CRUD operations for roles and role-permission assignments.
 */
export class DrizzleRoleRepository extends BaseRepository implements RoleRepository {
	/**
	 * Finds a role by its unique identifier.
	 *
	 * @param id - The role's primary key
	 * @returns The role data if found, null otherwise
	 */
	public async findById(id: number): Promise<RoleData | null> {
		const result = await this.db
			.select({
				id: role.id,
				name: role.name,
				code: role.code,
				description: role.description,
				removable: role.removable,
				createdAt: role.createdAt,
				updatedAt: role.updatedAt,
			})
			.from(role)
			.where(eq(role.id, id))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Finds a role by its unique code.
	 *
	 * @param code - The role's unique code (e.g., 'admin', 'editor')
	 * @returns The role data if found, null otherwise
	 */
	public async findByCode(code: string): Promise<RoleData | null> {
		const result = await this.db
			.select({
				id: role.id,
				name: role.name,
				code: role.code,
				description: role.description,
				removable: role.removable,
				createdAt: role.createdAt,
				updatedAt: role.updatedAt,
			})
			.from(role)
			.where(eq(role.code, code))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Finds a role by its display name.
	 *
	 * @param name - The role's display name (e.g., 'Administrator')
	 * @returns The role data if found, null otherwise
	 */
	public async findByName(name: string): Promise<RoleData | null> {
		const result = await this.db
			.select({
				id: role.id,
				name: role.name,
				code: role.code,
				description: role.description,
				removable: role.removable,
				createdAt: role.createdAt,
				updatedAt: role.updatedAt,
			})
			.from(role)
			.where(eq(role.name, name))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Retrieves all roles with pagination and optional search filtering.
	 * Search is case-insensitive and matches against name, code, or description.
	 *
	 * @param params - Optional list parameters
	 * @param params.offset - Number of records to skip (default: 0)
	 * @param params.limit - Maximum records to return (default: 10)
	 * @param params.search - Optional search term to filter by name, code, or description
	 * @returns Paginated response containing roles and metadata
	 */
	public async findAll(params?: ListRolesParams): Promise<PaginatedResponse<RoleData>> {
		const limit = params?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = params?.offset ?? QUERY_DEFAULTS.OFFSET
		const searchCondition = this.buildSearchCondition(params?.search)

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
				.from(role)
				.where(searchCondition)
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(role).where(searchCondition),
		])

		return {
			data,
			total: totalResult[0].count,
			offset,
			limit,
		}
	}

	/**
	 * Builds a case-insensitive search condition for filtering roles
	 * by name, code, or description.
	 *
	 * @param search - The search term to filter by
	 * @returns A SQL condition or undefined if no search term provided
	 */
	private buildSearchCondition(search?: string): SQL | undefined {
		if (!search || search.trim().length === 0) {
			return undefined
		}

		const escaped = search.trim().replace(/[%_]/g, '\\$&')
		const pattern = `%${escaped}%`
		return or(ilike(role.name, pattern), ilike(role.code, pattern), ilike(role.description, pattern))
	}

	/**
	 * Creates a new role in the database.
	 * New roles are created with removable=true by default.
	 *
	 * @param params - The role creation parameters
	 * @param params.name - Display name for the role
	 * @param params.code - Unique code identifier (lowercase, snake_case)
	 * @param params.description - Optional description of the role
	 * @returns The newly created role data
	 */
	public async create(params: CreateRoleParams, actorId: number): Promise<RoleData> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const result = await tx
				.insert(role)
				.values({
					name: params.name,
					code: params.code,
					description: params.description,
				})
				.returning({
					id: role.id,
					name: role.name,
					code: role.code,
					description: role.description,
					removable: role.removable,
					createdAt: role.createdAt,
					updatedAt: role.updatedAt,
				})

			const created = result[0]

			await tx.insert(roleHistory).values({
				roleId: created.id,
				action: RoleHistoryAction.CREATED,
				name: created.name,
				code: created.code,
				description: created.description,
				changedBy: actorId,
				changedAt: now,
			})

			return created
		})
	}

	/**
	 * Updates an existing role's properties.
	 * Only provided fields are updated; undefined fields are left unchanged.
	 * The updatedAt timestamp is automatically set.
	 *
	 * @param id - The role's primary key
	 * @param params - The fields to update
	 * @param params.name - New display name (optional)
	 * @param params.description - New description (optional)
	 * @returns The updated role data, or null if not found
	 */
	public async update(id: number, params: UpdateRoleParams, actorId: number): Promise<RoleData | null> {
		return this.db.transaction(async (tx) => {
			const now = new Date()
			const exists = await tx.select({ id: role.id }).from(role).where(eq(role.id, id)).limit(1)
			if (exists.length === 0) return null

			const updateData: Partial<typeof role.$inferInsert> = { updatedAt: now }
			if (params.name !== undefined) updateData.name = params.name
			if (params.description !== undefined) updateData.description = params.description

			const result = await tx.update(role).set(updateData).where(eq(role.id, id)).returning({
				id: role.id,
				name: role.name,
				code: role.code,
				description: role.description,
				removable: role.removable,
				createdAt: role.createdAt,
				updatedAt: role.updatedAt,
			})

			if (result.length === 0) return null

			await tx.insert(roleHistory).values({
				roleId: id,
				action: RoleHistoryAction.UPDATED,
				name: result[0].name,
				code: result[0].code,
				description: result[0].description,
				changedBy: actorId,
				changedAt: now,
			})

			return result[0]
		})
	}

	/**
	 * Deletes a role and its permission assignments in a transaction.
	 * User-role associations are automatically deleted via CASCADE constraint.
	 *
	 * @param id - The role's primary key
	 * @throws Will throw if role doesn't exist (no rows affected)
	 */
	public async delete(id: number, actorId: number): Promise<void> {
		await this.db.transaction(async (tx) => {
			const now = new Date()
			const existing = await tx
				.select({ name: role.name, code: role.code, description: role.description })
				.from(role)
				.where(eq(role.id, id))
				.limit(1)

			// Delete role_permission entries first (no CASCADE on this FK)
			await tx.delete(rolePermission).where(eq(rolePermission.roleId, id))

			// Delete the role
			await tx.delete(role).where(eq(role.id, id))

			if (existing.length > 0) {
				await tx.insert(roleHistory).values({
					roleId: id,
					action: RoleHistoryAction.DELETED,
					name: existing[0].name,
					code: existing[0].code,
					description: existing[0].description,
					changedBy: actorId,
					changedAt: now,
				})
			}
		})
	}

	/**
	 * Retrieves all permissions assigned to a role with pagination.
	 *
	 * @param roleId - The role's primary key
	 * @param pagination - Optional pagination parameters
	 * @param pagination.offset - Number of records to skip (default: 0)
	 * @param pagination.limit - Maximum records to return (default: 10)
	 * @returns Paginated response containing permissions and metadata
	 */
	public async findPermissionsForRole(
		roleId: number,
		pagination?: PaginationParams,
	): Promise<PaginatedResponse<PermissionData>> {
		const limit = pagination?.limit ?? QUERY_DEFAULTS.LIMIT
		const offset = pagination?.offset ?? QUERY_DEFAULTS.OFFSET

		const [data, totalResult] = await Promise.all([
			this.db
				.select({
					id: permission.id,
					name: permission.name,
					description: permission.description,
					module: permission.module,
					resource: permission.resource,
					action: permission.action,
				})
				.from(rolePermission)
				.innerJoin(permission, eq(rolePermission.permissionId, permission.id))
				.where(eq(rolePermission.roleId, roleId))
				.limit(limit)
				.offset(offset),
			this.db.select({ count: count() }).from(rolePermission).where(eq(rolePermission.roleId, roleId)),
		])

		return {
			data,
			total: totalResult[0].count,
			offset,
			limit,
		}
	}

	/**
	 * Finds permissions by their IDs.
	 * Used for validating permission IDs before assignment.
	 *
	 * @param ids - Array of permission primary keys
	 * @returns Array of found permissions (may be fewer than requested if some IDs are invalid)
	 */
	public async findPermissionsByIds(ids: number[]): Promise<PermissionData[]> {
		if (ids.length === 0) {
			return []
		}

		return this.db
			.select({
				id: permission.id,
				name: permission.name,
				description: permission.description,
				module: permission.module,
				resource: permission.resource,
				action: permission.action,
			})
			.from(permission)
			.where(inArray(permission.id, ids))
	}

	/**
	 * Assigns permissions to a role, replacing all existing assignments.
	 * Uses a transaction to ensure atomicity and prevent race conditions
	 * where the role would temporarily have no permissions.
	 *
	 * @param roleId - The role's primary key
	 * @param permissionIds - Array of permission IDs to assign (replaces existing)
	 */
	public async assignPermissions(roleId: number, permissionIds: number[], actorId: number): Promise<void> {
		await this.db.transaction(async (tx) => {
			// Snapshot existing permissions for audit diff
			const existingPerms = await tx
				.select({ permissionId: rolePermission.permissionId })
				.from(rolePermission)
				.where(eq(rolePermission.roleId, roleId))
			const oldPermissionIds = new Set(existingPerms.map((p) => p.permissionId))
			const newPermissionIds = new Set(permissionIds)

			// Remove existing permissions
			await tx.delete(rolePermission).where(eq(rolePermission.roleId, roleId))

			// Add new permissions
			if (permissionIds.length > 0) {
				const values = permissionIds.map((permissionId) => ({ roleId, permissionId }))
				await tx.insert(rolePermission).values(values).onConflictDoNothing()
			}

			// Write permission history rows for each change
			const now = new Date()
			const historyRows: Array<{
				roleId: number
				permissionId: number
				action: string
				changedBy: number
				changedAt: Date
			}> = []

			for (const id of oldPermissionIds) {
				if (!newPermissionIds.has(id)) {
					historyRows.push({
						roleId,
						permissionId: id,
						action: RolePermissionHistoryAction.REMOVED,
						changedBy: actorId,
						changedAt: now,
					})
				}
			}
			for (const id of newPermissionIds) {
				if (!oldPermissionIds.has(id)) {
					historyRows.push({
						roleId,
						permissionId: id,
						action: RolePermissionHistoryAction.ASSIGNED,
						changedBy: actorId,
						changedAt: now,
					})
				}
			}

			if (historyRows.length > 0) {
				await tx.insert(rolePermissionHistory).values(historyRows)
			}
		})
	}

	/**
	 * Removes all permission assignments from a role.
	 * The role itself is not deleted.
	 *
	 * @param roleId - The role's primary key
	 */
	public async removeAllPermissions(roleId: number): Promise<void> {
		await this.db.delete(rolePermission).where(eq(rolePermission.roleId, roleId))
	}
}
