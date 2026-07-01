import { TestBed } from '@angular/core/testing'
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { provideRouter, UrlTree } from '@angular/router'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { UIStore } from '@store/ui/ui.store'
import { NotificationType, type UINotification } from '@store/ui/ui.types'
import { permissionGuard } from './permission.guard'

type UIStoreMock = {
	showNotification: MockFn<[Omit<UINotification, 'id'>], void>
}

type TranslationMock = {
	instant: MockFn<[string], string>
}

function createUIStoreMock(): UIStoreMock {
	return {
		showNotification: fn<[Omit<UINotification, 'id'>], void>(),
	}
}

function createTranslationMock(): TranslationMock {
	const mock: TranslationMock = {
		instant: fn<[string], string>(),
	}
	mock.instant.mockReturnValue("You don't have permission to access that page.")
	return mock
}

describe('permissionGuard', () => {
	let uiStoreMock: UIStoreMock
	let translationMock: TranslationMock

	beforeEach(() => {
		clearAllMocks()

		uiStoreMock = createUIStoreMock()
		translationMock = createTranslationMock()

		TestBed.configureTestingModule({
			providers: [
				AuthStore,
				provideRouter([]),
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: UIStore, useValue: uiStoreMock },
				{ provide: Translation, useValue: translationMock },
			],
		})
	})

	function runGuard(requiredPermission?: string): boolean | UrlTree {
		const route = { data: { requiredPermission } } as unknown as ActivatedRouteSnapshot
		return TestBed.runInInjectionContext(() => permissionGuard(route, {} as RouterStateSnapshot)) as boolean | UrlTree
	}

	it('should allow navigation when no permission is required', () => {
		const result = runGuard(undefined)

		expect(result).toBe(true)
		expect(uiStoreMock.showNotification.calls).toHaveLength(0)
	})

	it('should allow navigation when user has the required permission', () => {
		const store = TestBed.inject(AuthStore)
		store.updateCurrentUser(
			createMockUser({
				hasPermission: (id: string) => id === 'admin:users:read',
			}),
		)

		const result = runGuard('admin:users:read')

		expect(result).toBe(true)
		expect(uiStoreMock.showNotification.calls).toHaveLength(0)
	})

	it('should redirect to /dashboard when user lacks the required permission', () => {
		const store = TestBed.inject(AuthStore)
		store.updateCurrentUser(createMockUser())

		const result = runGuard('admin:users:read')

		expect(result).toBeInstanceOf(UrlTree)
		expect((result as UrlTree).toString()).toBe('/dashboard')
	})

	it('should redirect to /dashboard when user is null', () => {
		const result = runGuard('admin:users:read')

		expect(result).toBeInstanceOf(UrlTree)
		expect((result as UrlTree).toString()).toBe('/dashboard')
	})

	it('should emit a translated toast exactly once when access is denied', () => {
		const store = TestBed.inject(AuthStore)
		store.updateCurrentUser(createMockUser())

		runGuard('admin:users:read')

		expect(uiStoreMock.showNotification.calls).toHaveLength(1)
		expect(uiStoreMock.showNotification.calls[0][0].type).toBe(NotificationType.ERROR)
		expect(translationMock.instant.calls).toHaveLength(1)
		expect(translationMock.instant.calls[0][0]).toBe('PERMISSIONS.ERRORS.ACCESS_DENIED')
	})

	it('should emit the deny toast even when the current user is null', () => {
		runGuard('admin:users:read')

		expect(uiStoreMock.showNotification.calls).toHaveLength(1)
		expect(uiStoreMock.showNotification.calls[0][0].type).toBe(NotificationType.ERROR)
	})
})
