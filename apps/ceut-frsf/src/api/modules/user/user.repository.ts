import { user } from '@schema/user'
import { eq } from 'drizzle-orm'
import { BaseRepository } from '../../helpers/base.repository'
import { type UserData, type UserRepository } from './interfaces'

/**
 * Repository for user-related database operations.
 * Handles user lookup by email and ID for authentication and profile management.
 */
export class DrizzleUserRepository extends BaseRepository implements UserRepository {
	/**
	 * Finds a user by their email address.
	 * Used during login to retrieve user data for authentication.
	 *
	 * @param email - Email address to search for
	 * @returns User data if found, null otherwise
	 */
	public async findByEmail(email: string): Promise<UserData | null> {
		const result = await this.db
			.select({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status,
			})
			.from(user)
			.where(eq(user.email, email))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}

	/**
	 * Finds a user by their unique identifier.
	 * Used for profile lookups and authorization checks.
	 *
	 * @param id - The user's primary key
	 * @returns User data if found, null otherwise
	 */
	public async findById(id: number): Promise<UserData | null> {
		const result = await this.db
			.select({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status,
			})
			.from(user)
			.where(eq(user.id, id))
			.limit(1)

		return result.length > 0 ? result[0] : null
	}
}
