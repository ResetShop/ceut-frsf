import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PLATFORM_ID, REQUEST } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { authInterceptor } from './auth.interceptor'
import { ssrCookieInterceptor } from './ssr-cookie.interceptor'

describe('ssrCookieInterceptor', () => {
	let http: HttpClient
	let httpMock: HttpTestingController

	function setup(request: { url: string; headers: { get: (name: string) => string | null } } | null) {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([ssrCookieInterceptor])),
				provideHttpClientTesting(),
				{ provide: PLATFORM_ID, useValue: 'server' },
				{ provide: REQUEST, useValue: request },
			],
		})

		http = TestBed.inject(HttpClient)
		httpMock = TestBed.inject(HttpTestingController)
	}

	afterEach(() => {
		httpMock.verify()
	})

	it('should forward cookies from REQUEST to API requests', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: (name: string) => (name === 'cookie' ? 'access_token=abc; refresh_token=xyz' : null) },
		}
		setup(mockRequest)

		http.get('/api/auth/me').subscribe()

		const req = httpMock.expectOne('/api/auth/me')
		expect(req.request.headers.get('Cookie')).toBe('access_token=abc; refresh_token=xyz')
		req.flush({})
	})

	it('should forward cookies for absolute API URLs', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: (name: string) => (name === 'cookie' ? 'access_token=abc; refresh_token=xyz' : null) },
		}
		setup(mockRequest)

		http.get('http://localhost:4200/api/auth/me').subscribe()

		const req = httpMock.expectOne('http://localhost:4200/api/auth/me')
		expect(req.request.headers.get('Cookie')).toBe('access_token=abc; refresh_token=xyz')
		req.flush({})
	})

	it('should not add Cookie header for non-API requests', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: (name: string) => (name === 'cookie' ? 'access_token=abc' : null) },
		}
		setup(mockRequest)

		http.get('/assets/i18n/en.json').subscribe()

		const req = httpMock.expectOne('/assets/i18n/en.json')
		expect(req.request.headers.has('Cookie')).toBe(false)
		req.flush({})
	})

	it('should not add Cookie header when REQUEST has no cookies', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: () => null },
		}
		setup(mockRequest)

		http.get('/api/users').subscribe()

		const req = httpMock.expectOne('/api/users')
		expect(req.request.headers.has('Cookie')).toBe(false)
		req.flush({})
	})

	it('should pass through when REQUEST is not available', () => {
		setup(null)

		http.get('/api/auth/me').subscribe()

		const req = httpMock.expectOne('/api/auth/me')
		expect(req.request.headers.has('Cookie')).toBe(false)
		req.flush({})
	})
})

describe('ssrCookieInterceptor + authInterceptor chain', () => {
	let http: HttpClient
	let httpMock: HttpTestingController

	function setup(request: { url: string; headers: { get: (name: string) => string | null } } | null) {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([ssrCookieInterceptor, authInterceptor])),
				provideHttpClientTesting(),
				{ provide: PLATFORM_ID, useValue: 'server' },
				{ provide: REQUEST, useValue: request },
			],
		})

		http = TestBed.inject(HttpClient)
		httpMock = TestBed.inject(HttpTestingController)
	}

	afterEach(() => {
		httpMock.verify()
	})

	it('should forward cookies for API requests without withCredentials on server', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: (name: string) => (name === 'cookie' ? 'access_token=abc; refresh_token=xyz' : null) },
		}
		setup(mockRequest)

		http.get('/api/auth/me').subscribe()

		const req = httpMock.expectOne('/api/auth/me')
		expect(req.request.headers.get('Cookie')).toBe('access_token=abc; refresh_token=xyz')
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})

	it('should not set withCredentials or cookies when REQUEST is absent', () => {
		setup(null)

		http.get('/api/users').subscribe()

		const req = httpMock.expectOne('/api/users')
		expect(req.request.headers.has('Cookie')).toBe(false)
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})

	it('should not modify non-API requests even with cookies available', () => {
		const mockRequest = {
			url: 'http://localhost:4200/',
			headers: { get: (name: string) => (name === 'cookie' ? 'access_token=abc' : null) },
		}
		setup(mockRequest)

		http.get('/assets/config.json').subscribe()

		const req = httpMock.expectOne('/assets/config.json')
		expect(req.request.headers.has('Cookie')).toBe(false)
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})
})
