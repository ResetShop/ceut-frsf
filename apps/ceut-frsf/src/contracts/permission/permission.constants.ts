/**
 * Permission definitions using the 3-part format (module:resource:action).
 *
 * Single source of truth for both backend middleware (requirePermission)
 * and frontend authorization (route guards, sidebar filtering, button visibility).
 *
 * To add a new permission:
 * 1. Add an entry to PERMISSION_DEFINITIONS with identifier and description
 * 2. Run `npm run sync:permissions` to insert it into the database
 */

// ============================================================================
// Branded type and validation
// ============================================================================

/**
 * Branded type for permission identifiers in module:resource:action format.
 * Ensures compile-time safety when passing identifiers to backend middleware.
 */
export type PermissionName = string & { readonly __brand: 'PermissionName' }

const PERMISSION_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/

/**
 * Validates and brands a permission identifier string.
 * @throws Error if format is invalid
 */
export function permission(name: string): PermissionName {
	if (!PERMISSION_PATTERN.test(name)) {
		throw new Error(
			`Invalid permission name: "${name}". Must be in module:resource:action format (e.g., 'admin:users:create')`,
		)
	}
	return name as PermissionName
}

/**
 * Type guard that checks if a string is a valid permission identifier.
 * Does not throw — returns false for invalid formats.
 */
export function isPermissionName(name: string): name is PermissionName {
	return PERMISSION_PATTERN.test(name)
}

// ============================================================================
// Permission definitions — the single array you edit to add new permissions
// ============================================================================

export const PERMISSION_DEFINITIONS = [
	// Permission management
	{ identifier: 'admin:permissions:read', description: 'View all system permissions' },
	// User management
	{ identifier: 'admin:users:create', description: 'Create new users' },
	{ identifier: 'admin:users:read', description: 'View user details' },
	{ identifier: 'admin:users:update', description: 'Update user information' },
	{ identifier: 'admin:users:delete', description: 'Delete users' },
	{ identifier: 'admin:users:reset_password', description: 'Reset user passwords' },
	{ identifier: 'admin:users:disable', description: 'Manage user account status' },
	// Role management
	{ identifier: 'admin:roles:create', description: 'Create new roles' },
	{ identifier: 'admin:roles:read', description: 'View role details' },
	{ identifier: 'admin:roles:update', description: 'Update roles' },
	{ identifier: 'admin:roles:delete', description: 'Delete roles' },
	// User-role assignment management
	{ identifier: 'admin:user_roles:read', description: 'View user role assignments' },
	{ identifier: 'admin:user_roles:assign', description: 'Assign roles to users' },
	{ identifier: 'admin:user_roles:remove', description: 'Remove roles from users' },
] as const

// ============================================================================
// Seed data
// ============================================================================

function parseIdentifier(identifier: string): { module: string; resource: string; action: string } {
	const [module, resource, action] = identifier.split(':')
	return { module, resource, action }
}

/**
 * All permission definitions for DB seeding.
 * Derived from PERMISSION_DEFINITIONS — module, resource, and action
 * are parsed from the identifier.
 */
export const PERMISSIONS_SEED_DATA = PERMISSION_DEFINITIONS.map((p) => ({
	name: p.identifier,
	description: p.description,
	...parseIdentifier(p.identifier),
}))
