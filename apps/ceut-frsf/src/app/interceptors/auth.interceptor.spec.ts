import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { authInterceptor } from './auth.interceptor'

describe('authInterceptor', () => {
	let http: HttpClient
	let httpMock: HttpTestingController

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
				{ provide: PLATFORM_ID, useValue: 'browser' },
			],
		})

		http = TestBed.inject(HttpClient)
		httpMock = TestBed.inject(HttpTestingController)
	})

	afterEach(() => {
		httpMock.verify()
	})

	it('should set withCredentials for API requests', () => {
		http.get('/api/users').subscribe()

		const req = httpMock.expectOne('/api/users')
		expect(req.request.withCredentials).toBe(true)
		req.flush({})
	})

	it('should set withCredentials for nested API paths', () => {
		http.get('/api/auth/me').subscribe()

		const req = httpMock.expectOne('/api/auth/me')
		expect(req.request.withCredentials).toBe(true)
		req.flush({})
	})

	it('should not set withCredentials for non-API requests', () => {
		http.get('/assets/i18n/en.json').subscribe()

		const req = httpMock.expectOne('/assets/i18n/en.json')
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})

	it('should set withCredentials for absolute URLs containing /api/', () => {
		// SSR resolves relative URLs to absolute (e.g., http://localhost:4200/api/auth/me).
		// URL parsing extracts the pathname so startsWith('/api/') matches both forms.
		http.get('http://localhost:4200/api/auth/me').subscribe()

		const req = httpMock.expectOne('http://localhost:4200/api/auth/me')
		expect(req.request.withCredentials).toBe(true)
		req.flush({})
	})

	it('should not set withCredentials for external non-API URLs', () => {
		http.get('https://cdn.example.com/data').subscribe()

		const req = httpMock.expectOne('https://cdn.example.com/data')
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})

	it('should not match /api/ in query parameters', () => {
		http.get('/callback?redirect=/api/users').subscribe()

		const req = httpMock.expectOne('/callback?redirect=/api/users')
		expect(req.request.withCredentials).toBe(false)
		req.flush({})
	})

	it('should pass through without withCredentials on server platform', () => {
		TestBed.resetTestingModule()
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
				{ provide: PLATFORM_ID, useValue: 'server' },
			],
		})

		const serverHttp = TestBed.inject(HttpClient)
		const serverHttpMock = TestBed.inject(HttpTestingController)

		serverHttp.get('/api/users').subscribe()

		const req = serverHttpMock.expectOne('/api/users')
		expect(req.request.withCredentials).toBe(false)
		req.flush({})

		serverHttpMock.verify()
	})
})
