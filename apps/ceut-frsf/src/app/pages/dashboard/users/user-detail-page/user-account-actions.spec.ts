import { TestBed } from '@angular/core/testing'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { UserStatus } from '@contracts/user/user.constants'
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
import { fireEvent, render, screen, within } from '@testing-library/angular'
import { of } from 'rxjs'
import { UserAccountActions } from './user-account-actions'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

describe('UserAccountActions', () => {
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
		usersApiMock.updateStatus.mockReturnValue(of(createMockManagedUser()))
		usersApiMock.resetPassword.mockReturnValue(of({ message: 'ok' }))
	})

	async function renderActions(permissions: string[], overrides: Partial<ManagedUser> = {}) {
		const view = await render(UserAccountActions, {
			inputs: { user: buildUser({ id: 1, ...overrides }) },
			providers: [
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => permissions.includes(id) }),
		)
		view.fixture.detectChanges()
		return view
	}

	it('hides actions when the target user is the current user', async () => {
		const view = await render(UserAccountActions, {
			inputs: { user: buildUser({ id: 42 }) },
			providers: [
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 42, hasPermission: () => true }))
		view.fixture.detectChanges()

		// Whole card is gone (not just the buttons) — no empty titled shell on the self-row.
		expect(screen.queryByText('Account Actions')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /send password reset link/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /disable user/i })).not.toBeInTheDocument()
	})

	it('hides the entire actions card when the actor has neither action permission', async () => {
		await renderActions([], { id: 7 })

		expect(screen.queryByText('Account Actions')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /send password reset link/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /disable user/i })).not.toBeInTheDocument()
	})

	it('shows the card with only the permitted button (reset hidden without admin:users:reset_password)', async () => {
		await renderActions(['admin:users:disable'])

		expect(screen.getByText('Account Actions')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /disable user/i })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /send password reset link/i })).not.toBeInTheDocument()
	})

	it('resets the password after confirmation', async () => {
		await renderActions(['admin:users:reset_password'], { id: 3 })

		fireEvent.click(screen.getByRole('button', { name: /send password reset link/i }))
		TestBed.tick()
		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /reset password/i }))

		expect(usersApiMock.resetPassword.calls).toHaveLength(1)
		expect(usersApiMock.resetPassword.calls[0][0]).toBe(3)
	})

	it('disables an active user after confirmation', async () => {
		await renderActions(['admin:users:disable'], { id: 4, status: UserStatus.ACTIVE })

		fireEvent.click(screen.getByRole('button', { name: /disable user/i }))
		TestBed.tick()
		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /disable user/i }))

		expect(usersApiMock.updateStatus.calls).toHaveLength(1)
		expect(usersApiMock.updateStatus.calls[0][0]).toBe(4)
		expect(usersApiMock.updateStatus.calls[0][1]).toEqual({ status: UserStatus.DISABLED })
	})

	it('enables a disabled user after confirmation', async () => {
		await renderActions(['admin:users:disable'], { id: 5, status: UserStatus.DISABLED })

		fireEvent.click(screen.getByRole('button', { name: /enable user/i }))
		TestBed.tick()
		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /enable user/i }))

		expect(usersApiMock.updateStatus.calls).toHaveLength(1)
		expect(usersApiMock.updateStatus.calls[0][1]).toEqual({ status: UserStatus.ACTIVE })
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:reset_password')).toBe(true)
		expect(validIdentifiers.has('admin:users:disable')).toBe(true)
	})
})
