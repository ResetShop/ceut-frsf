/**
 * Builds the i18n key that resolves a permission's display description, given the
 * permission's `module:resource:action` identifier.
 *
 * The permission catalogue (`PERMISSION_DEFINITIONS`) owns an English `description` that seeds
 * the `permission.description` database column and is returned by the permissions endpoint;
 * that value is the fallback, not the display text. What the UI shows comes from
 * `PERMISSIONS.DESCRIPTIONS` in the active language's translation file, keyed by this same
 * identifier. Every surface that renders a permission description resolves it through here.
 */
export function permissionDescriptionKey(identifier: string): `PERMISSIONS.DESCRIPTIONS.${string}` {
	return `PERMISSIONS.DESCRIPTIONS.${identifier}`
}
