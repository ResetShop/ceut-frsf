import { type UserData, type UserRepository } from './interfaces'

export class InMemoryUserRepository implements UserRepository {
	private users: Map<number, UserData> = new Map()
	private usersByEmail: Map<string, UserData> = new Map()

	/**
	 * Add a user to the mock repository for testing.
	 * @param user User data to add
	 */
	public addUser(user: UserData): void {
		this.users.set(user.id, user)
		this.usersByEmail.set(user.email, user)
	}

	/**
	 * Clear all users from the mock repository.
	 */
	public clear(): void {
		this.users.clear()
		this.usersByEmail.clear()
	}

	public async findByEmail(email: string): Promise<UserData | null> {
		return this.usersByEmail.get(email) ?? null
	}

	public async findById(id: number): Promise<UserData | null> {
		return this.users.get(id) ?? null
	}
}
