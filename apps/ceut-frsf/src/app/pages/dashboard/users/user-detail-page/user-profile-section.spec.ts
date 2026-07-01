import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { UsersApi } from '@providers/users/users.interface'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen } from '@testing-library/angular'
import { of, throwError } from 'rxjs'
import { UserProfileSection } from './user-profile-section'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

describe('UserProfileSection', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>

	beforeEach(() => {
		clearAllMocks()
		usersApiMock = {
			getAll: fn(),
			getById: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			updateStatus: fn(),
			resetPassword: fn(),
		}
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		usersApiMock.update.mockReturnValue(of(createMockManagedUser()))
	})

	async function renderSection(canUpdate = true, overrides: Partial<ManagedUser> = {}) {
		const view = await render(UserProfileSection, {
			inputs: { user: buildUser(overrides) },
			providers: [
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				...provideSignalFormsConfig({}),
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => (id === 'admin:users:update' ? canUpdate : true) }),
		)
		view.fixture.detectChanges()
		return view
	}

	it('populates the form fields from the user input', async () => {
		await renderSection(true, { firstName: 'Jane', lastName: 'Roe', email: 'jane@example.com' })

		expect(screen.getByRole('textbox', { name: /first name/i })).toHaveValue('Jane')
		expect(screen.getByRole('textbox', { name: /last name/i })).toHaveValue('Roe')
		expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('jane@example.com')
	})

	it('hides the save button when the user lacks admin:users:update', async () => {
		await renderSection(false)

		expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
	})

	it('calls updateUser with the edited profile when saved', async () => {
		await renderSection(true, { id: 5 })

		fireEvent.input(screen.getByRole('textbox', { name: /first name/i }), { target: { value: 'Updated' } })
		TestBed.tick()
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
		TestBed.tick()

		expect(usersApiMock.update.calls).toHaveLength(1)
		expect(usersApiMock.update.calls[0][0]).toBe(5)
		expect(usersApiMock.update.calls[0][1]).toMatchObject({ firstName: 'Updated' })
	})

	it('shows a destructive alert when the update fails', async () => {
		usersApiMock.update.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Email already in use' } })),
		)
		await renderSection(true, { id: 5 })

		fireEvent.input(screen.getByRole('textbox', { name: /first name/i }), { target: { value: 'Updated' } })
		TestBed.tick()
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
		TestBed.tick()

		expect(screen.getByRole('alert')).toHaveTextContent('Email already in use')
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:update')).toBe(true)
	})
})
