/**
 * Items for a menu that renders separators between groups. Accepts either:
 * - A flat list of items — a single group, no separators.
 * - A list of groups — a separator between every pair of non-empty groups.
 */
export type MenuItemsInput<T extends object> = readonly T[] | readonly (readonly T[])[]

/**
 * Normalizes `MenuItemsInput` into groups, dropping the empty ones, so a menu can render a separator
 * between every pair of groups it receives and consumers can build groups conditionally.
 */
export function toMenuGroups<T extends object>(items: MenuItemsInput<T>): readonly (readonly T[])[] {
	// Items are plain objects; only the grouped form has an array as its first element.
	const isGrouped = (value: MenuItemsInput<T>): value is readonly (readonly T[])[] =>
		value.length > 0 && Array.isArray(value[0])
	const groups = isGrouped(items) ? items : [items]
	return groups.filter((group) => group.length > 0)
}
