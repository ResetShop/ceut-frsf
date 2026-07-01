import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PLATFORM_ID, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { of, throwError, type Observable } from 'rxjs'
import { tokenRefreshInterceptor } from './token-refresh.interceptor'

type AuthStoreMock = {
	isTokenRefreshing: ReturnType<typeof signal<boolean>>
	isAuthenticated: ReturnType<typeof signal<boolean>>
	startTokenRefresh: MockFn
	completeTokenRefresh: MockFn
	failTokenRefresh: MockFn
	logout: MockFn
	refreshToken: MockFn<[], Observable<unknown>>
}

function createAuthStoreMock(): AuthStoreMock {
	return {
		isTokenRefreshing: signal(false),
		isAuthenticated: signal(true),
		startTokenRefresh: fn(),
		completeTokenRefresh: fn(),
		failTokenRefresh: fn(),
		logout: fn(),
		refreshToken: fn<[], Observable<unknown>>(),
	}
}

function flush401(httpMock: HttpTestingController, url: string) {
	httpMock.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' })
}

describe('tokenRefreshInterceptor', () => {
	describe('browser platform', () => {
		let http: HttpClient
		let httpMock: HttpTestingController
		let authStoreMock: AuthStoreMock

		beforeEach(() => {
			clearAllMocks()

			authStoreMock = createAuthStoreMock()

			TestBed.configureTestingModule({
				providers: [
					provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
					provideHttpClientTesting(),
					{ provide: PLATFORM_ID, useValue: 'browser' },
					{ provide: AuthStore, useValue: authStoreMock },
				],
			})

			http = TestBed.inject(HttpClient)
			httpMock = TestBed.inject(HttpTestingController)
		})

		afterEach(() => {
			httpMock.verify()
		})

		it('should pass through successful requests', () => {
			let result: unknown
			http.get('/api/users').subscribe((r) => (result = r))

			httpMock.expectOne('/api/users').flush({ data: 'ok' })

			expect(result).toEqual({ data: 'ok' })
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
		})

		it('should pass through non-401 errors', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			httpMock.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' })

			expect(error?.status).toBe(500)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
			expect(authStoreMock.logout.calls).toHaveLength(0)
		})

		it('should logout when refresh endpoint returns 401', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/auth/refresh').subscribe({ error: (e) => (error = e) })

			flush401(httpMock, '/api/auth/refresh')

			expect(error?.status).toBe(401)
			expect(authStoreMock.logout.calls).toHaveLength(1)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
		})

		it('should pass through 401 on login endpoint without refreshing', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/auth/login').subscribe({ error: (e) => (error = e) })

			flush401(httpMock, '/api/auth/login')

			expect(error?.status).toBe(401)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
			expect(authStoreMock.logout.calls).toHaveLength(0)
		})

		it('should pass through 401 on logout endpoint without refreshing', () => {
			let error: HttpErrorResponse | undefined
			http.post('/api/auth/logout', {}).subscribe({ error: (e) => (error = e) })

			flush401(httpMock, '/api/auth/logout')

			expect(error?.status).toBe(401)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
			expect(authStoreMock.logout.calls).toHaveLength(0)
		})

		it('should refresh token and retry the original request on 401', () => {
			authStoreMock.refreshToken.mockReturnValue(of({}))

			let result: unknown
			http.get('/api/users').subscribe((r) => (result = r))

			// Original request fails with 401
			flush401(httpMock, '/api/users')

			// Interceptor retries after successful refresh
			httpMock.expectOne('/api/users').flush({ data: 'retried' })

			expect(result).toEqual({ data: 'retried' })
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(1)
			expect(authStoreMock.completeTokenRefresh.calls).toHaveLength(1)
			expect(authStoreMock.logout.calls).toHaveLength(0)
		})

		it('should logout when token refresh fails', () => {
			authStoreMock.refreshToken.mockReturnValue(throwError(() => new Error('refresh failed')))

			let error: unknown
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			flush401(httpMock, '/api/users')

			expect(error).toBeInstanceOf(Error)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(1)
			expect(authStoreMock.failTokenRefresh.calls).toHaveLength(1)
			expect(authStoreMock.logout.calls).toHaveLength(1)
			expect(authStoreMock.completeTokenRefresh.calls).toHaveLength(0)
		})

		it('should not start a new refresh when one is already in progress', () => {
			authStoreMock.isTokenRefreshing.set(true)

			http.get('/api/users').subscribe({
				error: () => {
					/* empty on purpose */
				},
			})

			flush401(httpMock, '/api/users')

			// Should not start another refresh — waits for the in-progress one
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
		})

		it('should retry the request after a concurrent refresh completes', () => {
			authStoreMock.isTokenRefreshing.set(true)

			let result: unknown
			http.get('/api/users').subscribe((r) => (result = r))

			// Original request fails with 401
			flush401(httpMock, '/api/users')

			// Simulate the concurrent refresh completing
			authStoreMock.isTokenRefreshing.set(false)
			TestBed.tick()

			// Interceptor retries the original request
			httpMock.expectOne('/api/users').flush({ data: 'after-concurrent-refresh' })

			expect(result).toEqual({ data: 'after-concurrent-refresh' })
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
		})

		it('should fail immediately when user was logged out during concurrent refresh', () => {
			authStoreMock.isTokenRefreshing.set(true)

			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			// Original request fails with 401
			flush401(httpMock, '/api/users')

			// Simulate refresh failing and user being logged out
			authStoreMock.isAuthenticated.set(false)
			authStoreMock.isTokenRefreshing.set(false)
			TestBed.tick()

			// Should fail immediately — no retry attempt
			expect(error?.status).toBe(401)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
		})
	})

	describe('server platform', () => {
		let http: HttpClient
		let httpMock: HttpTestingController
		let authStoreMock: AuthStoreMock

		beforeEach(() => {
			clearAllMocks()

			authStoreMock = createAuthStoreMock()

			TestBed.configureTestingModule({
				providers: [
					provideHttpClient(withInterceptors([tokenRefreshInterceptor])),
					provideHttpClientTesting(),
					{ provide: PLATFORM_ID, useValue: 'server' },
					{ provide: AuthStore, useValue: authStoreMock },
				],
			})

			http = TestBed.inject(HttpClient)
			httpMock = TestBed.inject(HttpTestingController)
		})

		afterEach(() => {
			httpMock.verify()
		})

		it('should pass through requests without intercepting on server', () => {
			let result: unknown
			http.get('/api/users').subscribe((r) => (result = r))

			httpMock.expectOne('/api/users').flush({ data: 'ssr' })

			expect(result).toEqual({ data: 'ssr' })
		})

		it('should not attempt token refresh on 401 during SSR', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			flush401(httpMock, '/api/users')

			expect(error?.status).toBe(401)
			expect(authStoreMock.startTokenRefresh.calls).toHaveLength(0)
			expect(authStoreMock.logout.calls).toHaveLength(0)
		})
	})
})
