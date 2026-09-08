/**
 * Permission identifiers granted to the seeded Editor role — content management only,
 * no user or role administration. Validated against `PERMISSION_DEFINITIONS` in the
 * companion spec so a typo here fails the unit test suite instead of silently
 * granting nothing (or throwing at seed time from a permission-count mismatch).
 */
export const EDITOR_ROLE_PERMISSIONS = [
	'content:cards:create',
	'content:cards:read',
	'content:cards:update',
	'content:cards:delete',
] as const
