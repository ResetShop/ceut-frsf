import type { IUser } from '@domain/user/user.interface'

/**
 * Create a minimal IUser stub for tests. Override specific fields as needed.
 *
 * @example
 * ```typescript
 * const admin = createMockUser({ email: 'admin@test.com' });
 * ```
 */
export function createMockUser(overrides: Partial<IUser> = {}): IUser {
	return {
		id: 1,
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		fullName: 'Test User',
		roles: [],
		permissions: [],
		hasPermission: () => false,
		hasRole: () => false,
		...overrides,
	}
}
