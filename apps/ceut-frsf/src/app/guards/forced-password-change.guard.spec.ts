import { TestBed } from '@angular/core/testing'
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { provideRouter, UrlTree } from '@angular/router'
import { AuthApi } from '@providers/auth/auth.interface'
import { createMockMeResponse, InMemoryAuthApi } from '@providers/auth/auth.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { firstValueFrom } from 'rxjs'
import { forcedPasswordChangeGuard } from './forced-password-change.guard'

describe('forcedPasswordChangeGuard', () => {
	let authApi: InMemoryAuthApi

	// The guard is synchronous — it reads the store signal that authGuard populated beforehand.
	function runGuard(): boolean | UrlTree {
		return TestBed.runInInjectionContext(() =>
			forcedPasswordChangeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
		) as boolean | UrlTree
	}

	beforeEach(() => {
		clearAllMocks()
		authApi = new InMemoryAuthApi()

		TestBed.configureTestingModule({
			providers: [AuthStore, provideRouter([]), { provide: AuthApi, useValue: authApi }],
		})
	})

	it('allows navigation when the user does not need to change their password', () => {
		// Initial store state has mustChangePassword = false.
		expect(runGuard()).toBe(true)
	})

	it('redirects to /auth/change-password when the user must change their password', async () => {
		authApi.setAuthenticatedUser(createMockMeResponse({ mustChangePassword: true }))
		const store = TestBed.inject(AuthStore)
		// validateSession() patches mustChangePassword — mirrors authGuard running first.
		await firstValueFrom(store.validateSession())

		const result = runGuard()

		expect(result).toBeInstanceOf(UrlTree)
		expect((result as UrlTree).toString()).toBe('/auth/change-password')
	})
})
