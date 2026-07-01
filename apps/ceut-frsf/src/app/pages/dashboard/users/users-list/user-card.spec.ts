import { TestBed } from '@angular/core/testing'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { UserCard } from './user-card'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

describe('UserCard', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderCard(overrides: Partial<ManagedUser> = {}) {
		const editSpy: MockFn = fn()
		const deleteSpy: MockFn = fn()
		const resetPasswordSpy: MockFn = fn()
		const view = await render(UserCard, {
			inputs: { user: buildUser(overrides) },
			on: { edit: editSpy, delete: deleteSpy, resetPassword: resetPasswordSpy },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		// id=999 keeps the current user distinct from the card's user (default id=1) so the
		// self-row hide-rule on the reset password action doesn't suppress button assertions.
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 999, hasPermission: () => true }))
		view.fixture.detectChanges()
		return { view, editSpy, deleteSpy, resetPasswordSpy }
	}

	it('renders the full name and email', async () => {
		await renderCard({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' })

		expect(screen.getByText('John Doe')).toBeInTheDocument()
		expect(screen.getByText('john@example.com')).toBeInTheDocument()
	})

	it('formats and renders the user status with a default-variant badge when active', async () => {
		await renderCard({ status: UserStatus.ACTIVE })

		expect(screen.getByText('Active')).toBeInTheDocument()
	})

	it('renders an em dash when the user has no roles', async () => {
		await renderCard({ roles: [] })

		expect(screen.getByText('—')).toBeInTheDocument()
	})

	it('renders comma-separated role names when the user has roles', async () => {
		await renderCard({
			roles: [
				{
					id: 1,
					name: 'Admin',
					code: 'admin',
					description: null,
					removable: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: 2,
					name: 'Editor',
					code: 'editor',
					description: null,
					removable: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
		})

		expect(screen.getByText('Admin, Editor')).toBeInTheDocument()
	})

	it('emits edit when the edit button is clicked', async () => {
		const user = userEvent.setup()
		const { editSpy } = await renderCard()

		await user.click(screen.getByRole('button', { name: /edit/i }))

		expect(editSpy.calls).toHaveLength(1)
	})

	it('emits delete when the delete button is clicked', async () => {
		const user = userEvent.setup()
		const { deleteSpy } = await renderCard()

		await user.click(screen.getByRole('button', { name: /delete/i }))

		expect(deleteSpy.calls).toHaveLength(1)
	})

	it('renders the reset password button when the user has admin:users:reset_password', async () => {
		await renderCard()

		expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
	})

	it('emits resetPassword when the reset password button is clicked', async () => {
		const user = userEvent.setup()
		const { resetPasswordSpy } = await renderCard()

		await user.click(screen.getByRole('button', { name: /reset password/i }))

		expect(resetPasswordSpy.calls).toHaveLength(1)
	})

	it('hides the reset password button when the current user lacks admin:users:reset_password', async () => {
		const view = await render(UserCard, {
			inputs: { user: buildUser() },
			on: { edit: fn(), delete: fn(), resetPassword: fn() },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => id !== 'admin:users:reset_password' }),
		)
		view.fixture.detectChanges()

		expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})

	it('hides the reset password and delete buttons when the card user is the current user', async () => {
		const view = await render(UserCard, {
			inputs: { user: buildUser({ id: 42 }) },
			on: { edit: fn(), delete: fn(), resetPassword: fn() },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 42, hasPermission: () => true }))
		view.fixture.detectChanges()

		expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
		// Edit remains visible — users may update their own profile.
		expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
	})

	it('hides the edit button when the current user lacks admin:users:update', async () => {
		const editSpy: MockFn = fn()
		const deleteSpy: MockFn = fn()
		const view = await render(UserCard, {
			inputs: { user: buildUser() },
			on: { edit: editSpy, delete: deleteSpy },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => id !== 'admin:users:update' }),
		)
		view.fixture.detectChanges()

		expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:update')).toBe(true)
		expect(validIdentifiers.has('admin:users:delete')).toBe(true)
		expect(validIdentifiers.has('admin:users:reset_password')).toBe(true)
	})
})
