/**
 * User status values — single source of truth for all layers.
 *
 * Imported by:
 * - DB schema (Drizzle pgEnum)
 * - API contracts (Zod schemas)
 * - Frontend domain (IManagedUser.status comparisons)
 *
 * This file has zero dependencies so it can be safely imported anywhere.
 */
export const UserStatus = Object.freeze({
	ACTIVE: 'active',
	DISABLED: 'disabled',
	DELETED: 'deleted',
} as const)

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]
