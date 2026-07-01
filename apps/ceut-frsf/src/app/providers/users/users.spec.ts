import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import type { PaginatedResponse } from '@contracts/common/pagination.types'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import type {
	CreateUserRequest,
	CreateUserResponse,
	ManagedUser,
	UpdateUserRequest,
	UpdateUserStatusRequest,
} from '@contracts/user/user.types'
import { HttpUsersApi } from './users'
import { createMockManagedUser } from './users.mock'

describe('HttpUsersApi', () => {
	let service: HttpUsersApi
	let httpMock: HttpTestingController

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [HttpUsersApi, provideHttpClient(), provideHttpClientTesting()],
		})

		service = TestBed.inject(HttpUsersApi)
		httpMock = TestBed.inject(HttpTestingController)
	})

	afterEach(() => {
		httpMock.verify()
	})

	describe('getAll', () => {
		it('should make GET request to /api/users with default pagination', () => {
			const mockResponse: PaginatedResponse<ManagedUser> = {
				data: [createMockManagedUser()],
				total: 1,
				offset: QUERY_DEFAULTS.OFFSET,
				limit: QUERY_DEFAULTS.LIMIT,
			}

			service.getAll().subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne(
				(r) =>
					r.url === '/api/users' &&
					r.params.get('offset') === String(QUERY_DEFAULTS.OFFSET) &&
					r.params.get('limit') === String(QUERY_DEFAULTS.LIMIT),
			)
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})

		it('should include search param when provided', () => {
			const mockResponse: PaginatedResponse<ManagedUser> = {
				data: [],
				total: 0,
				offset: 0,
				limit: 10,
			}

			service.getAll({ search: 'john', offset: 0, limit: 10 }).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne((r) => r.url === '/api/users' && r.params.get('search') === 'john')
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})

		it('should omit search param when not provided', () => {
			service.getAll({ offset: 0, limit: 10 }).subscribe()

			const req = httpMock.expectOne((r) => r.url === '/api/users')
			expect(req.request.params.has('search')).toBe(false)

			req.flush({ data: [], total: 0, offset: 0, limit: 10 })
		})
	})

	describe('getById', () => {
		it('should make GET request to /api/users/:id', () => {
			const mockUser = createMockManagedUser({ id: 42 })

			service.getById(42).subscribe((result) => {
				expect(result).toEqual(mockUser)
			})

			const req = httpMock.expectOne('/api/users/42')
			expect(req.request.method).toBe('GET')

			req.flush(mockUser)
		})
	})

	describe('create', () => {
		it('should make POST request to /api/users', () => {
			const body: CreateUserRequest = {
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'User',
				mustChangePassword: true,
				roleIds: [1],
			}
			const mockResponse: CreateUserResponse = {
				...createMockManagedUser({ id: 2, email: 'new@example.com', firstName: 'New' }),
				passwordEmailSent: true,
			}

			service.create(body).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/users')
			expect(req.request.method).toBe('POST')
			expect(req.request.body).toEqual(body)

			req.flush(mockResponse)
		})
	})

	describe('update', () => {
		it('should make PATCH request to /api/users/:id', () => {
			const body: UpdateUserRequest = { firstName: 'Updated' }
			const mockResponse = createMockManagedUser({ firstName: 'Updated' })

			service.update(1, body).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/users/1')
			expect(req.request.method).toBe('PATCH')
			expect(req.request.body).toEqual(body)

			req.flush(mockResponse)
		})
	})

	describe('delete', () => {
		it('should make DELETE request to /api/users/:id', () => {
			service.delete(1).subscribe()

			const req = httpMock.expectOne('/api/users/1')
			expect(req.request.method).toBe('DELETE')

			req.flush(null)
		})
	})

	describe('updateStatus', () => {
		it('should make PATCH request to /api/users/:id/status', () => {
			const body: UpdateUserStatusRequest = { status: 'disabled' }
			const mockResponse = createMockManagedUser({ status: 'disabled' })

			service.updateStatus(1, body).subscribe((result) => {
				expect(result).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/users/1/status')
			expect(req.request.method).toBe('PATCH')
			expect(req.request.body).toEqual(body)

			req.flush(mockResponse)
		})
	})

	describe('error handling', () => {
		it('should propagate HTTP errors', () => {
			service.getAll().subscribe({
				next: () => expect.unreachable('should have failed'),
				error: (error) => {
					expect(error.status).toBe(500)
				},
			})

			const req = httpMock.expectOne((r) => r.url === '/api/users')
			req.flush(null, { status: 500, statusText: 'Internal Server Error' })
		})
	})
})
