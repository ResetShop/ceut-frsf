import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import type { LoginRequest, LoginResponse, MeResponse, RefreshResponse } from '@contracts/auth/auth.types'
import { HttpAuthApi } from './auth'

describe('HttpAuthApi', () => {
	let service: HttpAuthApi
	let httpMock: HttpTestingController

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [HttpAuthApi, provideHttpClient(), provideHttpClientTesting()],
		})

		service = TestBed.inject(HttpAuthApi)
		httpMock = TestBed.inject(HttpTestingController)
	})

	afterEach(() => {
		httpMock.verify()
	})

	describe('login', () => {
		it('should make POST request to /api/auth/login', () => {
			const loginRequest: LoginRequest = {
				email: 'test@example.com',
				password: 'password123',
			}

			const mockResponse: LoginResponse = {
				user: {
					id: 1,
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					roles: [],
				},
				mustChangePassword: false,
			}

			service.login(loginRequest).subscribe((response) => {
				expect(response).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/auth/login')
			expect(req.request.method).toBe('POST')
			expect(req.request.body).toEqual(loginRequest)

			req.flush(mockResponse)
		})
	})

	describe('logout', () => {
		it('should make POST request to /api/auth/logout', () => {
			service.logout().subscribe()

			const req = httpMock.expectOne('/api/auth/logout')
			expect(req.request.method).toBe('POST')
			expect(req.request.body).toEqual({})

			req.flush(null)
		})
	})

	describe('refreshToken', () => {
		it('should make POST request to /api/auth/refresh', () => {
			const mockResponse: RefreshResponse = {}

			service.refreshToken().subscribe((response) => {
				expect(response).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/auth/refresh')
			expect(req.request.method).toBe('POST')
			expect(req.request.body).toEqual({})

			req.flush(mockResponse)
		})
	})

	describe('getMe', () => {
		it('should make GET request to /api/auth/me', () => {
			const mockResponse: MeResponse = {
				id: 1,
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				roles: [],
				mustChangePassword: false,
			}

			service.getMe().subscribe((response) => {
				expect(response).toEqual(mockResponse)
			})

			const req = httpMock.expectOne('/api/auth/me')
			expect(req.request.method).toBe('GET')

			req.flush(mockResponse)
		})
	})

	describe('error handling', () => {
		it('should propagate HTTP errors', () => {
			const loginRequest: LoginRequest = {
				email: 'test@example.com',
				password: 'wrong-password',
			}

			service.login(loginRequest).subscribe({
				next: () => expect.unreachable('should have failed'),
				error: (error) => {
					expect(error.status).toBe(401)
					expect(error.error.code).toBe('INVALID_CREDENTIALS')
				},
			})

			const req = httpMock.expectOne('/api/auth/login')
			req.flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' })
		})
	})
})
