import { permission } from '@contracts/permission/permission.constants'
import type { PaginatedResponse, PaginationParams } from '../../../interfaces'
import type { UserRoleRepository } from '../../user/interfaces'
import type {
	CreateRoleParams,
	ListRolesParams,
	PermissionData,
	RoleData,
	RoleRepository,
	UpdateRoleParams,
} from './interfaces'

export const ROLE_ERRORS = {
	NOT_FOUND: 'Role not found',
	CODE_EXISTS: 'A role with this code already exists',
	NAME_EXISTS: 'A role with this name already exists',
	NOT_REMOVABLE: 'This role cannot be deleted',
	INVALID_PERMISSION_IDS: 'Invalid permission IDs',
	SELF_LOCKOUT: 'Cannot remove role management permission from your own role',
} as const

/**
 * Error factory functions that include entity IDs for better debugging.
 * The error messages start with the base error constant for easy matching in tests.
 */
export const roleErrors = {
	notFound: (id: number) => new Error(`${ROLE_ERRORS.NOT_FOUND} (id: ${id})`),
	codeExists: (code: string) => new Error(`${ROLE_ERRORS.CODE_EXISTS} (code: ${code})`),
	nameExists: (name: string) => new Error(`${ROLE_ERRORS.NAME_EXISTS} (name: ${name})`),
	notRemovable: (id: number) => new Error(`${ROLE_ERRORS.NOT_REMOVABLE} (id: ${id})`),
}

/**
 * Error thrown when invalid permission IDs are provided
 */
export class InvalidPermissionIdsError extends Error {
	public readonly invalidIds: number[]

	constructor(invalidIds: number[]) {
		super(ROLE_ERRORS.INVALID_PERMISSION_IDS)
		this.name = 'InvalidPermissionIdsError'
		this.invalidIds = invalidIds
	}
}

/**
 * Error thrown when user attempts to remove role management permission from their own role
 */
export class SelfLockoutError extends Error {
	constructor() {
		super(ROLE_ERRORS.SELF_LOCKOUT)
		this.name = 'SelfLockoutError'
	}
}

interface RoleServiceDeps {
	roleRepository: RoleRepository
	userRoleRepository: UserRoleRepository
}

/**
 * Service for role management operations.
 * Handles CRUD operations for roles and role-permission assignments.
 * Enforces business rules like unique codes/names and non-removable system roles.
 */
export class RoleService {
	private roleRepository: RoleRepository
	private userRoleRepository: UserRoleRepository

	constructor({ roleRepository, userRoleRepository }: RoleServiceDeps) {
		this.roleRepository = roleRepository
		this.userRoleRepository = userRoleRepository
	}

	/**
	 * Retrieves a role by its unique identifier.
	 *
	 * @param id - The role's primary key
	 * @returns The role data if found, null otherwise
	 */
	public async getRole(id: number): Promise<RoleData | null> {
		return this.roleRepository.findById(id)
	}

	/**
	 * Retrieves a role by its unique code.
	 *
	 * @param code - The role's unique code (e.g., 'admin', 'editor')
	 * @returns The role data if found, null otherwise
	 */
	public async getRoleByCode(code: string): Promise<RoleData | null> {
		return this.roleRepository.findByCode(code)
	}

	/**
	 * Retrieves all roles with pagination and optional search filtering.
	 *
	 * @param params - Optional parameters (offset, limit, search)
	 * @returns Paginated response containing roles and metadata
	 */
	public async getAllRoles(params?: ListRolesParams): Promise<PaginatedResponse<RoleData>> {
		return this.roleRepository.findAll(params)
	}

	/**
	 * Creates a new role with the specified properties.
	 * Validates that both code and name are unique.
	 *
	 * @param params - Role creation parameters (name, code, description)
	 * @param actorId - ID of the user performing the action
	 * @returns The newly created role data
	 * @throws Error if a role with the same code or name already exists
	 */
	public async createRole(params: CreateRoleParams, actorId: number): Promise<RoleData> {
		// Check if code already exists
		const existingByCode = await this.roleRepository.findByCode(params.code)
		if (existingByCode) {
			throw roleErrors.codeExists(params.code)
		}

		// Check if name already exists
		const existingByName = await this.roleRepository.findByName(params.name)
		if (existingByName) {
			throw roleErrors.nameExists(params.name)
		}

		return this.roleRepository.create(params, actorId)
	}

	/**
	 * Updates an existing role's properties.
	 * Only name and description can be updated; code is immutable.
	 *
	 * @param id - The role's primary key
	 * @param params - Fields to update (name, description)
	 * @param actorId - ID of the user performing the action
	 * @returns The updated role data
	 * @throws Error if role not found or new name conflicts with existing role
	 */
	public async updateRole(id: number, params: UpdateRoleParams, actorId: number): Promise<RoleData> {
		// Check if role exists
		const existingRole = await this.roleRepository.findById(id)
		if (!existingRole) {
			throw roleErrors.notFound(id)
		}

		// Check if name already exists (if updating name)
		if (params.name !== undefined && params.name !== existingRole.name) {
			const roleWithName = await this.roleRepository.findByName(params.name)
			if (roleWithName) {
				throw roleErrors.nameExists(params.name)
			}
		}

		const updatedRole = await this.roleRepository.update(id, params, actorId)

		if (!updatedRole) {
			throw roleErrors.notFound(id)
		}

		return updatedRole
	}

	/**
	 * Deletes a role and its permission assignments.
	 * System roles (removable=false) cannot be deleted.
	 *
	 * @param id - The role's primary key
	 * @param actorId - ID of the user performing the action
	 * @throws Error if role not found or is a non-removable system role
	 */
	public async deleteRole(id: number, actorId: number): Promise<void> {
		const existingRole = await this.roleRepository.findById(id)

		if (!existingRole) {
			throw roleErrors.notFound(id)
		}

		if (!existingRole.removable) {
			throw roleErrors.notRemovable(id)
		}

		await this.roleRepository.delete(id, actorId)
	}

	/**
	 * Retrieves all permissions assigned to a role with pagination.
	 *
	 * @param roleId - The role's primary key
	 * @param pagination - Optional pagination parameters (offset, limit)
	 * @returns Paginated response containing permissions and metadata
	 * @throws Error if role not found
	 */
	public async getRolePermissions(
		roleId: number,
		pagination?: PaginationParams,
	): Promise<PaginatedResponse<PermissionData>> {
		const existingRole = await this.roleRepository.findById(roleId)

		if (!existingRole) {
			throw roleErrors.notFound(roleId)
		}

		return this.roleRepository.findPermissionsForRole(roleId, pagination)
	}

	/**
	 * Assigns permissions to a role, replacing all existing assignments.
	 * Validates that all permission IDs exist before making changes.
	 * Prevents self-lockout by checking if the user would lose role management permissions.
	 *
	 * @param roleId - The role's primary key
	 * @param permissionIds - Array of permission IDs to assign (replaces existing)
	 * @param actorId - ID of the user performing the action (used for self-lockout prevention and audit)
	 * @throws Error if role not found
	 * @throws InvalidPermissionIdsError if any permission IDs don't exist in database
	 * @throws SelfLockoutError if update would remove user's ability to manage roles
	 */
	public async assignPermissionsToRole(roleId: number, permissionIds: number[], actorId: number): Promise<void> {
		const existingRole = await this.roleRepository.findById(roleId)

		if (!existingRole) {
			throw roleErrors.notFound(roleId)
		}

		// Validate permission IDs exist and get permission data
		let foundPermissions: PermissionData[] = []
		if (permissionIds.length > 0) {
			foundPermissions = await this.roleRepository.findPermissionsByIds(permissionIds)
			const foundIds = new Set(foundPermissions.map((p) => p.id))
			const invalidIds = permissionIds.filter((id) => !foundIds.has(id))

			if (invalidIds.length > 0) {
				throw new InvalidPermissionIdsError(invalidIds)
			}
		}

		// Self-lockout prevention check
		// Fetch actor's current permissions and role assignment in parallel
		const [userPermissions, userHasRole, currentRolePermissions] = await Promise.all([
			this.userRoleRepository.findPermissionsForUser(actorId),
			this.userRoleRepository.findUserHasRole(actorId, roleId),
			this.roleRepository.findPermissionsForRole(roleId, { limit: 1000 }),
		])

		// Only need to check for lockout if the user is assigned to the role being modified
		if (userHasRole) {
			const rolesUpdatePermission = permission('admin:roles:update')
			const newPermissionsIncludeUpdate = foundPermissions.some((p) => p.name === rolesUpdatePermission)

			if (!newPermissionsIncludeUpdate) {
				// Check if user has UPDATE permission from other roles
				const currentRolePermissionNames = new Set(currentRolePermissions.data.map((p) => p.name))
				const otherRolePermissions = userPermissions.filter((p) => !currentRolePermissionNames.has(p.name))
				const hasUpdateFromOtherRole = otherRolePermissions.some((p) => p.name === rolesUpdatePermission)

				if (!hasUpdateFromOtherRole) {
					throw new SelfLockoutError()
				}
			}
		}

		await this.roleRepository.assignPermissions(roleId, permissionIds, actorId)
	}
}
