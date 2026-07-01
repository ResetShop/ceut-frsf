import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn, spyOn, type MockFn } from '@resetshop/util/test-utils'
import { UIStore } from '@store/ui/ui.store'
import { NotificationType, type UINotification } from '@store/ui/ui.types'
import { NgpToastManager } from 'ng-primitives/toast'
import { forbiddenInterceptor } from './forbidden.interceptor'

type UIStoreMock = {
	showNotification: MockFn<[Omit<UINotification, 'id'>], void>
}

function createUIStoreMock(): UIStoreMock {
	return {
		showNotification: fn<[Omit<UINotification, 'id'>], void>(),
	}
}

type TranslationMock = {
	instant: MockFn<[string], string>
}

function createTranslationMock(): TranslationMock {
	const mock: TranslationMock = {
		instant: fn<[string], string>(),
	}
	mock.instant.mockReturnValue("You don't have permission to perform this action")
	return mock
}

describe('forbiddenInterceptor', () => {
	describe('browser platform', () => {
		let http: HttpClient
		let httpMock: HttpTestingController
		let uiStoreMock: UIStoreMock
		let translationMock: TranslationMock
		let consoleErrorSpy: MockFn

		beforeEach(() => {
			clearAllMocks()

			uiStoreMock = createUIStoreMock()
			translationMock = createTranslationMock()

			TestBed.configureTestingModule({
				providers: [
					provideHttpClient(withInterceptors([forbiddenInterceptor])),
					provideHttpClientTesting(),
					{ provide: PLATFORM_ID, useValue: 'browser' },
					{ provide: UIStore, useValue: uiStoreMock },
					{ provide: Translation, useValue: translationMock },
				],
			})

			http = TestBed.inject(HttpClient)
			httpMock = TestBed.inject(HttpTestingController)
			consoleErrorSpy = spyOn(console, 'error')
		})

		afterEach(() => {
			httpMock.verify()
		})

		it('should pass through successful requests', () => {
			let result: unknown
			http.get('/api/users').subscribe((r) => (result = r))

			httpMock.expectOne('/api/users').flush({ data: 'ok' })

			expect(result).toEqual({ data: 'ok' })
			expect(uiStoreMock.showNotification.calls).toHaveLength(0)
		})

		it('should pass through non-403 errors without showing notification', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			httpMock.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' })

			expect(error?.status).toBe(500)
			expect(uiStoreMock.showNotification.calls).toHaveLength(0)
		})

		it('should show toast notification on 403 response', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(error?.status).toBe(403)
			expect(uiStoreMock.showNotification.calls).toHaveLength(1)
			expect(uiStoreMock.showNotification.calls[0][0]).toEqual({
				type: NotificationType.ERROR,
				message: "You don't have permission to perform this action",
			})
		})

		it('should use translated message for the notification', () => {
			http.get('/api/roles').subscribe({
				error: () => {
					/* empty on purpose */
				},
			})

			httpMock.expectOne('/api/roles').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(translationMock.instant.calls).toHaveLength(1)
			expect(translationMock.instant.calls[0][0]).toBe('HTTP.ERRORS.FORBIDDEN')
		})

		it('should not suppress the error — let it propagate to subscribers', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(error).toBeInstanceOf(HttpErrorResponse)
			expect(error?.status).toBe(403)
		})

		it('should log the 403 event for debugging', () => {
			http.get('/api/users').subscribe({
				error: () => {
					/* empty on purpose */
				},
			})

			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(consoleErrorSpy.calls).toHaveLength(1)
			expect(consoleErrorSpy.calls[0][0]).toContain('[ForbiddenInterceptor]')
			expect(consoleErrorSpy.calls[0][0]).toContain('403 Forbidden')
			expect(consoleErrorSpy.calls[0][0]).toContain('GET')
		})

		it('should show notification for each 403 response independently', () => {
			http.get('/api/users').subscribe({
				error: () => {
					/* empty on purpose */
				},
			})
			http.get('/api/roles').subscribe({
				error: () => {
					/* empty on purpose */
				},
			})

			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })
			httpMock.expectOne('/api/roles').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(uiStoreMock.showNotification.calls).toHaveLength(2)
		})
	})

	// A 403 can fire on a route that never called provideToast(), so the lazily-instantiated root
	// ToastBridgeService is dormant and the notification never renders. The interceptor activates the bridge
	// on demand. Here we wire the REAL bridge + REAL UIStore + a mock NgpToastManager and assert the toast
	// actually renders (manager.show is called) on a 403 — and is NOT activated for a non-403 error.
	describe('toast bridge activation (browser)', () => {
		let http: HttpClient
		let httpMock: HttpTestingController
		let showMock: MockFn

		beforeEach(() => {
			clearAllMocks()
			showMock = fn()
			showMock.mockReturnValue({ dismiss: fn() })

			TestBed.configureTestingModule({
				providers: [
					provideHttpClient(withInterceptors([forbiddenInterceptor])),
					provideHttpClientTesting(),
					{ provide: PLATFORM_ID, useValue: 'browser' },
					{ provide: Translation, useValue: createTranslationMock() },
					// Real UIStore + real ToastBridgeService (both providedIn: 'root'); only the renderer is mocked.
					{ provide: NgpToastManager, useValue: { show: showMock } },
				],
			})

			http = TestBed.inject(HttpClient)
			httpMock = TestBed.inject(HttpTestingController)
			spyOn(console, 'error') // mute the interceptor's 403 log; the log itself is asserted in the browser block
		})

		afterEach(() => {
			httpMock.verify()
		})

		it('activates the root bridge so a 403 renders a toast with no prior provideToast()', () => {
			http.get('/api/users').subscribe({ error: () => undefined })
			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })
			TestBed.tick()

			expect(showMock.calls).toHaveLength(1)
		})

		it('does not activate the bridge or render for a non-403 error', () => {
			http.get('/api/users').subscribe({ error: () => undefined })
			httpMock.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' })
			TestBed.tick()

			expect(showMock.calls).toHaveLength(0)
		})
	})

	describe('server platform', () => {
		let http: HttpClient
		let httpMock: HttpTestingController
		let uiStoreMock: UIStoreMock

		beforeEach(() => {
			clearAllMocks()

			uiStoreMock = createUIStoreMock()

			TestBed.configureTestingModule({
				providers: [
					provideHttpClient(withInterceptors([forbiddenInterceptor])),
					provideHttpClientTesting(),
					{ provide: PLATFORM_ID, useValue: 'server' },
					{ provide: UIStore, useValue: uiStoreMock },
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

		it('should not show notification on 403 during SSR', () => {
			let error: HttpErrorResponse | undefined
			http.get('/api/users').subscribe({ error: (e) => (error = e) })

			httpMock.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' })

			expect(error?.status).toBe(403)
			expect(uiStoreMock.showNotification.calls).toHaveLength(0)
		})
	})
})
