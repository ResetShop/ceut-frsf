import { makeEnvironmentProviders } from '@angular/core'
import type { PaginatedResponse, SearchPaginationParams } from '@contracts/common/pagination.types'
import { UserStatus } from '@contracts/user/user.constants'
import type {
	CreateUserRequest,
	CreateUserResponse,
	ManagedUser,
	ResetPasswordResponse,
	UpdateUserRequest,
	UpdateUserStatusRequest,
} from '@contracts/user/user.types'
import type { Observable } from 'rxjs'
import { of, throwError } from 'rxjs'
import type { UsersApi } from './users.interface'
import { UsersApi as UsersApiToken } from './users.interface'

export function createMockManagedUser(overrides: Partial<ManagedUser> = {}): ManagedUser {
	return {
		id: 1,
		email: 'john@example.com',
		firstName: 'John',
		lastName: 'Doe',
		status: UserStatus.ACTIVE,
		statusChangedAt: null,
		statusChangedBy: null,
		deletedAt: null,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01'),
		roles: [
			{
				id: 1,
				name: 'Admin',
				code: 'admin',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
			},
		],
		...overrides,
	}
}

/**
 * Pre-built user list with diverse statuses, roles, and dates for pagination and search testing.
 * 12 users across 2 pages at default page size (10), with mixed statuses and role assignments.
 */
export const MOCK_USERS: ManagedUser[] = [
	createMockManagedUser({
		id: 1,
		email: 'admin@sistema.com',
		firstName: 'Administrador',
		lastName: 'Sistema',
		roles: [
			{
				id: 1,
				name: 'Administrator',
				code: 'admin',
				description: 'System administrator with full access',
				removable: false,
				createdAt: null,
				updatedAt: null,
			},
		],
	}),
	createMockManagedUser({
		id: 2,
		email: 'john@example.com',
		firstName: 'John',
		lastName: 'Doe',
		roles: [
			{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
		],
	}),
	createMockManagedUser({
		id: 3,
		email: 'jane@example.com',
		firstName: 'Jane',
		lastName: 'Smith',
		roles: [
			{ id: 3, name: 'Viewer', code: 'viewer', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-01-10'),
		updatedAt: new Date('2025-01-10'),
	}),
	createMockManagedUser({
		id: 4,
		email: 'bob@example.com',
		firstName: 'Bob',
		lastName: 'Wilson',
		status: UserStatus.DISABLED,
		statusChangedAt: new Date('2025-02-15'),
		statusChangedBy: 1,
		roles: [],
		createdAt: new Date('2025-01-05'),
		updatedAt: new Date('2025-02-15'),
	}),
	createMockManagedUser({
		id: 5,
		email: 'alice@example.com',
		firstName: 'Alice',
		lastName: 'Johnson',
		roles: [
			{
				id: 1,
				name: 'Administrator',
				code: 'admin',
				description: null,
				removable: false,
				createdAt: null,
				updatedAt: null,
			},
			{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-01-20'),
		updatedAt: new Date('2025-01-20'),
	}),
	createMockManagedUser({
		id: 6,
		email: 'charlie@example.com',
		firstName: 'Charlie',
		lastName: 'Brown',
		roles: [],
		createdAt: new Date('2025-02-01'),
		updatedAt: new Date('2025-02-01'),
	}),
	createMockManagedUser({
		id: 7,
		email: 'diana@example.com',
		firstName: 'Diana',
		lastName: 'Prince',
		roles: [
			{
				id: 4,
				name: 'User Manager',
				code: 'user_manager',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
			},
		],
		createdAt: new Date('2025-02-10'),
		updatedAt: new Date('2025-02-10'),
	}),
	createMockManagedUser({
		id: 8,
		email: 'eve@example.com',
		firstName: 'Eve',
		lastName: 'Taylor',
		status: UserStatus.DISABLED,
		statusChangedAt: new Date('2025-03-01'),
		statusChangedBy: 1,
		roles: [
			{ id: 3, name: 'Viewer', code: 'viewer', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-02-15'),
		updatedAt: new Date('2025-03-01'),
	}),
	createMockManagedUser({
		id: 9,
		email: 'frank@example.com',
		firstName: 'Frank',
		lastName: 'Miller',
		roles: [
			{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-02-20'),
		updatedAt: new Date('2025-02-20'),
	}),
	createMockManagedUser({
		id: 10,
		email: 'grace@example.com',
		firstName: 'Grace',
		lastName: 'Lee',
		roles: [
			{ id: 5, name: 'Auditor', code: 'auditor', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-03-01'),
		updatedAt: new Date('2025-03-01'),
	}),
	createMockManagedUser({
		id: 11,
		email: 'hank@example.com',
		firstName: 'Hank',
		lastName: 'Garcia',
		roles: [],
		createdAt: new Date('2025-03-05'),
		updatedAt: new Date('2025-03-05'),
	}),
	createMockManagedUser({
		id: 12,
		email: 'iris@example.com',
		firstName: 'Iris',
		lastName: 'Chen',
		roles: [
			{ id: 3, name: 'Viewer', code: 'viewer', description: null, removable: true, createdAt: null, updatedAt: null },
		],
		createdAt: new Date('2025-03-10'),
		updatedAt: new Date('2025-03-10'),
	}),
]

export class InMemoryUsersApi implements UsersApi {
	private users = new Map<number, ManagedUser>()
	private errors = new Map<string, Error>()
	private nextId = 100

	public addUser(user: ManagedUser): void {
		this.users.set(user.id, user)
	}

	public clear(): void {
		this.users.clear()
		this.errors.clear()
	}

	public setError(method: keyof UsersApi, error: Error): void {
		this.errors.set(method, error)
	}

	public clearErrors(): void {
		this.errors.clear()
	}

	public getAll(params?: SearchPaginationParams): Observable<PaginatedResponse<ManagedUser>> {
		const error = this.errors.get('getAll')
		if (error) {
			return throwError(() => error)
		}

		let data = [...this.users.values()]

		if (params?.search) {
			const search = params.search.toLowerCase()
			data = data.filter(
				(u) =>
					u.firstName.toLowerCase().includes(search) ||
					u.lastName.toLowerCase().includes(search) ||
					u.email.toLowerCase().includes(search),
			)
		}

		const total = data.length
		const offset = params?.offset ?? 0
		const limit = params?.limit ?? 10
		const page = data.slice(offset, offset + limit)

		return of({ data: page, total, offset, limit })
	}

	public getById(id: number): Observable<ManagedUser> {
		const error = this.errors.get('getById')
		if (error) {
			return throwError(() => error)
		}

		const user = this.users.get(id)
		if (!user) {
			return throwError(() => new Error(`User ${id} not found`))
		}
		return of(user)
	}

	public create(body: CreateUserRequest): Observable<CreateUserResponse> {
		const error = this.errors.get('create')
		if (error) {
			return throwError(() => error)
		}

		const id = this.nextId++
		const user: ManagedUser = {
			id,
			email: body.email,
			firstName: body.firstName,
			lastName: body.lastName,
			status: UserStatus.ACTIVE,
			statusChangedAt: null,
			statusChangedBy: null,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			roles: [],
		}
		this.users.set(id, user)
		return of({ ...user, passwordEmailSent: true })
	}

	public update(id: number, body: UpdateUserRequest): Observable<ManagedUser> {
		const error = this.errors.get('update')
		if (error) {
			return throwError(() => error)
		}

		const user = this.users.get(id)
		if (!user) {
			return throwError(() => new Error(`User ${id} not found`))
		}

		const updated = { ...user, ...body, updatedAt: new Date() }
		this.users.set(id, updated)
		return of(updated)
	}

	public delete(id: number): Observable<void> {
		const error = this.errors.get('delete')
		if (error) {
			return throwError(() => error)
		}

		this.users.delete(id)
		return of(undefined)
	}

	public updateStatus(id: number, body: UpdateUserStatusRequest): Observable<ManagedUser> {
		const error = this.errors.get('updateStatus')
		if (error) {
			return throwError(() => error)
		}

		const user = this.users.get(id)
		if (!user) {
			return throwError(() => new Error(`User ${id} not found`))
		}

		const updated = { ...user, status: body.status, statusChangedAt: new Date(), updatedAt: new Date() }
		this.users.set(id, updated)
		return of(updated)
	}

	public resetPassword(id: number): Observable<ResetPasswordResponse> {
		const error = this.errors.get('resetPassword')
		if (error) {
			return throwError(() => error)
		}

		const user = this.users.get(id)
		if (!user) {
			return throwError(() => new Error(`User ${id} not found`))
		}
		return of({ message: 'Password reset successfully' })
	}
}

export function provideUsersMock(api: InMemoryUsersApi = new InMemoryUsersApi()) {
	return makeEnvironmentProviders([{ provide: UsersApiToken, useValue: api }])
}
