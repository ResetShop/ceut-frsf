import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
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
import { DRAWER_SPINNER_MIN_DISPLAY } from '@resetshop/ui/drawer/drawer-loading'
import { parseDurationToMs } from '@resetshop/util'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen, within } from '@testing-library/angular'
import { of, throwError } from 'rxjs'
import { EditUserDrawer } from './edit-user-drawer'

const ROLES = [
	{ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null },
	{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
]

const ALL_PERMISSIONS = () => true

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(
		createMockManagedUser({
			id: 8,
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
			status: UserStatus.ACTIVE,
			roles: [ROLES[0]],
			...overrides,
		}),
	)
}

describe('EditUserDrawer', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>
	let rolesApiMock: Record<keyof RolesApi, MockFn>

	beforeEach(() => {
		useFakeTimers()
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
		usersApiMock.update.mockReturnValue(of(createMockManagedUser()))
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of(ROLES))
	})

	afterEach(() => useRealTimers())

	async function renderOpenDrawer(
		options: { user?: Partial<ManagedUser>; actorId?: number; hasPermission?: (id: string) => boolean } = {},
	) {
		const view = await render(EditUserDrawer, {
			providers: [
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				...provideSignalFormsConfig({}),
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: options.actorId ?? 999, hasPermission: options.hasPermission ?? ALL_PERMISSIONS }),
		)
		view.fixture.componentInstance.open(buildUser(options.user))
		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_SPINNER_MIN_DISPLAY))
		view.fixture.detectChanges()
		return view
	}

	function typeInto(name: RegExp, value: string) {
		fireEvent.input(screen.getByRole('textbox', { name }), { target: { value } })
		TestBed.tick()
	}

	function reviewChanges() {
		fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
		TestBed.tick()
		return screen.getByRole('alertdialog', { name: 'Confirm changes' })
	}

	function confirmChanges(dialog: HTMLElement) {
		fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
		TestBed.tick()
	}

	it('pre-fills the form from the user when opened', async () => {
		await renderOpenDrawer()

		expect(screen.getByRole('textbox', { name: /first name/i })).toHaveValue('Ada')
		expect(screen.getByRole('textbox', { name: /last name/i })).toHaveValue('Lovelace')
		expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('ada@example.com')
		expect(screen.getByRole('checkbox', { name: /admin/i })).toBeChecked()
		expect(screen.getByRole('checkbox', { name: /editor/i })).not.toBeChecked()
		expect(screen.getByRole('combobox')).toHaveTextContent('Active')
	})

	it('keeps the review button disabled until something changes', async () => {
		await renderOpenDrawer()

		expect(screen.getByRole('button', { name: 'Review changes' })).toBeDisabled()

		typeInto(/first name/i, 'Grace')

		expect(screen.getByRole('button', { name: 'Review changes' })).toBeEnabled()
	})

	it.each([
		['first name is empty', /first name/i, ''],
		['first name is too long', /first name/i, 'A'.repeat(101)],
		['last name is empty', /last name/i, ''],
		['email is invalid', /email/i, 'not-an-email'],
	])('keeps the review button disabled and never opens the confirmation when %s', async (_, field, value) => {
		await renderOpenDrawer()
		typeInto(field, value)

		const reviewButton = screen.getByRole('button', { name: 'Review changes' })
		expect(reviewButton).toBeDisabled()

		fireEvent.click(reviewButton)
		TestBed.tick()

		expect(screen.queryByRole('alertdialog', { name: 'Confirm changes' })).not.toBeInTheDocument()
		expect(usersApiMock.update.calls).toHaveLength(0)
	})

	it('shows the before and after values for review without persisting yet', async () => {
		await renderOpenDrawer()
		typeInto(/first name/i, 'Grace')

		const dialog = reviewChanges()

		expect(within(dialog).getByRole('term')).toHaveTextContent('First Name')
		expect(within(dialog).getByRole('definition')).toHaveTextContent('Before: Ada')
		expect(within(dialog).getByRole('definition')).toHaveTextContent('After: Grace')
		expect(usersApiMock.update.calls).toHaveLength(0)
	})

	it('sends only the changed fields once the changes are confirmed', async () => {
		await renderOpenDrawer()
		typeInto(/first name/i, 'Grace')

		confirmChanges(reviewChanges())

		expect(usersApiMock.update.calls).toHaveLength(1)
		expect(usersApiMock.update.calls[0][0]).toBe(8)
		expect(usersApiMock.update.calls[0][1]).toEqual({ firstName: 'Grace' })
	})

	it('sends nothing when the confirmation is cancelled', async () => {
		await renderOpenDrawer()
		typeInto(/first name/i, 'Grace')

		const dialog = reviewChanges()
		fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
		TestBed.tick()

		expect(usersApiMock.update.calls).toHaveLength(0)
	})

	it('reviews and sends profile, role, and status changes together in one request', async () => {
		await renderOpenDrawer()
		typeInto(/email/i, 'grace@example.com')
		fireEvent.click(screen.getByRole('checkbox', { name: /editor/i }))
		fireEvent.click(screen.getByRole('combobox'))
		await advanceTimersByTimeAsync(0)
		fireEvent.click(screen.getByRole('option', { name: 'Disabled' }))
		TestBed.tick()

		const dialog = reviewChanges()
		const rows = within(dialog)
			.getAllByRole('term')
			.map((term) => term.textContent?.trim())
		expect(rows).toEqual(['Email', 'Roles', 'Status'])
		expect(within(dialog).getByText('Admin, Editor', { exact: false })).toBeInTheDocument()
		confirmChanges(dialog)

		expect(usersApiMock.update.calls).toHaveLength(1)
		expect(usersApiMock.update.calls[0][1]).toEqual({
			email: 'grace@example.com',
			roleIds: [1, 2],
			status: UserStatus.DISABLED,
		})
	})

	it('shows status as a read-only label when the actor lacks admin:users:disable', async () => {
		await renderOpenDrawer({ hasPermission: (id) => id !== 'admin:users:disable' })

		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		expect(screen.getByText('Status')).toBeInTheDocument()
		expect(screen.getByText('Active')).toBeInTheDocument()
	})

	it('never sends a status when the actor lacks admin:users:disable', async () => {
		await renderOpenDrawer({ hasPermission: (id) => id !== 'admin:users:disable' })
		typeInto(/last name/i, 'Hopper')

		confirmChanges(reviewChanges())

		expect(usersApiMock.update.calls[0][1]).toEqual({ lastName: 'Hopper' })
	})

	it('shows status as a read-only label and locks the admin role when editing your own account', async () => {
		await renderOpenDrawer({ actorId: 8 })

		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		expect(screen.getByText('Active')).toBeInTheDocument()
		expect(screen.getByRole('checkbox', { name: /admin/i })).toBeDisabled()
	})

	it('shows a destructive alert inline when the update fails', async () => {
		usersApiMock.update.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Email already in use' } })),
		)
		const view = await renderOpenDrawer()
		typeInto(/email/i, 'taken@example.com')

		confirmChanges(reviewChanges())
		view.fixture.detectChanges()

		expect(screen.getByRole('alert')).toHaveTextContent('Email already in use')
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:disable')).toBe(true)
	})
})
