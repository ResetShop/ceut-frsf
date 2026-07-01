import { TestBed } from '@angular/core/testing'
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { provideRouter, UrlTree } from '@angular/router'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { createMockMeResponse, InMemoryAuthApi } from '@providers/auth/auth.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import type { Observable } from 'rxjs'
import { firstValueFrom } from 'rxjs'
import { authGuard } from './auth.guard'

describe('authGuard', () => {
	let authApi: InMemoryAuthApi

	// validateSession() always returns an Observable, never a synchronous value
	function runGuard(): Observable<boolean | UrlTree> {
		return TestBed.runInInjectionContext(() =>
			authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
		) as Observable<boolean | UrlTree>
	}

	beforeEach(() => {
		clearAllMocks()

		authApi = new InMemoryAuthApi()
		// Default: no session (getMe throws)

		TestBed.configureTestingModule({
			providers: [AuthStore, provideRouter([]), { provide: AuthApi, useValue: authApi }],
		})
	})

	it('should allow navigation when session is valid', async () => {
		authApi.setAuthenticatedUser(createMockMeResponse())

		const result = await firstValueFrom(runGuard())

		expect(result).toBe(true)
	})

	it('should redirect to /auth/login when session validation fails', async () => {
		// Default InMemoryAuthApi has no authenticated user — getMe throws
		const result = await firstValueFrom(runGuard())

		expect(result).toBeInstanceOf(UrlTree)
		expect((result as UrlTree).toString()).toBe('/auth/login')
	})

	it('should update currentUser with fresh data from /me response', async () => {
		authApi.setAuthenticatedUser(createMockMeResponse({ email: 'updated@example.com', firstName: 'Updated' }))

		const store = TestBed.inject(AuthStore)
		await firstValueFrom(runGuard())

		expect(store.currentUser()?.email).toBe('updated@example.com')
		expect(store.currentUser()?.firstName).toBe('Updated')
	})

	it('should not clear a stale currentUser when session validation fails', async () => {
		const store = TestBed.inject(AuthStore)
		store.updateCurrentUser(createMockUser({ email: 'stale@example.com' }))

		// Default InMemoryAuthApi has no authenticated user — getMe throws
		await firstValueFrom(runGuard())

		// validateSession does not clear currentUser on error — the guard redirects instead
		expect(store.currentUser()?.email).toBe('stale@example.com')
	})
})
