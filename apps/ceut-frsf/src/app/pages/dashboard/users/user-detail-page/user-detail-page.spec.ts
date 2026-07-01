import { TestBed } from '@angular/core/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { UserStatus } from '@contracts/user/user.constants'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { RolesApi } from '@providers/roles/roles.interface'
import { UsersApi } from '@providers/users/users.interface'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	spyOn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen, within } from '@testing-library/angular'
import { of } from 'rxjs'
import UserDetailPage from './user-detail-page'

describe('UserDetailPage', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>
	let rolesApiMock: Record<keyof RolesApi, MockFn>

	beforeEach(() => {
		clearAllMocks()
		useFakeTimers()
		usersApiMock = {
			getAll: fn(),
			getById: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			updateStatus: fn(),
			resetPassword: fn(),
		}
		rolesApiMock = {
			getAll: fn(),
			getAllUnpaginated: fn(),
			getByIdWithPermissions: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			assignPermissions: fn(),
		}
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of([]))
	})

	afterEach(() => useRealTimers())

	async function renderPage(routeId: string) {
		const view = await render(UserDetailPage, {
			providers: [
				provideRouter([]),
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
				...provideSignalFormsConfig({}),
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 999, hasPermission: () => true }))
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()
		return view
	}

	it('loads the user identified by the route id', async () => {
		usersApiMock.getById.mockReturnValue(of(createMockManagedUser({ id: 12 })))

		await renderPage('12')

		expect(usersApiMock.getById.calls).toHaveLength(1)
		expect(usersApiMock.getById.calls[0][0]).toBe(12)
	})

	it('renders the user sections once loaded', async () => {
		usersApiMock.getById.mockReturnValue(
			of(createMockManagedUser({ id: 1, firstName: 'Ada', lastName: 'Lovelace', status: UserStatus.ACTIVE })),
		)

		await renderPage('1')

		expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: /roles/i })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: /account actions/i })).toBeInTheDocument()
		expect(screen.getByText('Active')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /back to users/i })).toBeInTheDocument()
	})

	it('does not load a user when the route id is not a positive integer', async () => {
		await renderPage('abc')

		expect(usersApiMock.getById.calls).toHaveLength(0)
		expect(screen.getByRole('link', { name: /back to users/i })).toBeInTheDocument()
	})

	it('navigates back to the list after the viewed user is deleted', async () => {
		usersApiMock.getById.mockReturnValue(of(createMockManagedUser({ id: 7, status: UserStatus.ACTIVE })))
		usersApiMock.delete.mockReturnValue(of(undefined))
		const view = await renderPage('7')
		const navigateSpy = spyOn(TestBed.inject(Router), 'navigate')

		fireEvent.click(screen.getByRole('button', { name: /delete user/i }))
		TestBed.tick()
		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /delete/i }))
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()

		expect(usersApiMock.delete.calls).toHaveLength(1)
		expect(usersApiMock.delete.calls[0][0]).toBe(7)
		expect(navigateSpy.calls).toHaveLength(1)
		expect(navigateSpy.calls[0][0]).toEqual(['/dashboard/users'])
	})
})
