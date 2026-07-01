import { BreakpointObserver } from '@angular/cdk/layout'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
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
import { NEVER, of, throwError } from 'rxjs'
import UsersList from './users-list'

/**
 * Opens the row-actions menu for the only row currently in the table. Returns nothing —
 * subsequent `screen.getByRole('menuitem', ...)` queries find the popover-rendered items.
 *
 * The menu is rendered in a portal on `document.body`, outside the test fixture's view tree.
 * The `afterEach` hook below dispatches Escape to close the menu, letting the library remove
 * its own portal so tests stay isolated.
 */
async function openRowActionsMenu(): Promise<void> {
	fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
	TestBed.tick()
	await advanceTimersByTimeAsync(50)
}

describe('UsersList', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>
	let rolesApiMock: Record<keyof RolesApi, MockFn>
	let breakpointObserverMock: { observe: MockFn }

	beforeEach(() => {
		clearAllMocks()
		useFakeTimers()
		spyOn(console, 'error')

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

		breakpointObserverMock = {
			observe: fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
		}

		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAll.mockReturnValue(of({ data: [], total: 0, limit: 10, offset: 0 }))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of([]))
	})

	afterEach(() => {
		useRealTimers()
		// The row-actions menu attaches its popover to a portal on `document.body`, outside the
		// Angular test fixture's view tree. Testing Library's auto-cleanup destroys the fixture
		// but does not reach the portal; leftover menus cause "Found multiple elements" errors in
		// subsequent tests. Remove them via the data-testid baked into RowActionsMenu's template.
		screen.queryAllByTestId('row-actions-menu').forEach((el) => el.remove())
	})

	function setUserWithAllPermissions(): void {
		// id=999 keeps the current user distinct from row mock ids (1–12) so the self-row
		// hide-rule on the destructive actions doesn't suppress assertions on menu items.
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 999, hasPermission: () => true }))
	}

	async function renderComponent() {
		const view = await render(UsersList, {
			providers: [
				provideRouter([]),
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		setUserWithAllPermissions()
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()
		return view
	}

	it('should show action skeletons while loading', async () => {
		usersApiMock.getAll.mockReturnValue(NEVER)

		await render(UsersList, {
			providers: [
				provideRouter([]),
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		setUserWithAllPermissions()
		TestBed.tick()

		expect(screen.getByTestId('users-actions-skeleton')).toBeInTheDocument()
		expect(screen.queryByPlaceholderText(/search users/i)).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument()
	})

	describe('drawer responsive width classes', () => {
		// Regression guard for the CRUD drawer responsive width classes. The panel must be full-width
		// below the `sm:` breakpoint and pinned to 512 px from `sm:` up (`w-full sm:w-lg`). The consumer
		// class is merged into `<dialog>` via the DrawerPanel directive's `panelClasses` computed.

		it('should apply w-full sm:w-lg to the Create User drawer dialog', async () => {
			await renderComponent()

			fireEvent.click(screen.getByRole('button', { name: /create user/i }))
			TestBed.tick()

			const dialog = screen.getByRole('dialog', { name: /create user/i })
			expect(dialog).toHaveClass('w-full')
			expect(dialog).toHaveClass('sm:w-lg')
		})
	})

	describe('edit navigation', () => {
		it('navigates to the user detail page when the Edit row action is selected', async () => {
			const users = [createMockManagedUser({ id: 7, firstName: 'John', lastName: 'Doe' })]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

			await renderComponent()
			const navigateSpy = spyOn(TestBed.inject(Router), 'navigate')
			await openRowActionsMenu()

			fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
			TestBed.tick()

			expect(navigateSpy.calls).toHaveLength(1)
			expect(navigateSpy.calls[0][0]).toEqual(['/dashboard/users', 7])
		})
	})

	describe('responsive action bar classes', () => {
		// jsdom cannot evaluate media queries; assert class-presence as a regression guard for the
		// mobile-first stacking rule. Visual breakpoint behaviour is covered by Storybook stories.

		it('should stack the loading skeleton vertically below sm: and side-by-side from sm: up', async () => {
			usersApiMock.getAll.mockReturnValue(NEVER)

			await render(UsersList, {
				providers: [
					provideRouter([]),
					{ provide: UsersApi, useValue: usersApiMock },
					{ provide: RolesApi, useValue: rolesApiMock },
					{ provide: AuthApi, useValue: new InMemoryAuthApi() },
					{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
					{ provide: Translation, useValue: mockTranslation },
					{ provide: BreakpointObserver, useValue: breakpointObserverMock },
				],
			})
			setUserWithAllPermissions()
			TestBed.tick()

			const skeleton = screen.getByTestId('users-actions-skeleton')
			expect(skeleton).toHaveClass('flex-col')
			expect(skeleton).toHaveClass('sm:flex-row')
		})

		it('should mark the Create User button full-width on mobile and auto-width from sm: up', async () => {
			await renderComponent()

			const createButton = screen.getByRole('button', { name: /create user/i })
			expect(createButton).toHaveClass('w-full')
			expect(createButton).toHaveClass('sm:w-auto')
		})
	})

	it('should show real actions after loading completes', async () => {
		await renderComponent()

		expect(screen.queryByTestId('users-actions-skeleton')).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument()
	})

	it('should render the page heading', async () => {
		await renderComponent()

		expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument()
	})

	it('should render the description text', async () => {
		await renderComponent()

		expect(screen.getByText(/manage system users/i)).toBeInTheDocument()
	})

	it('should render a search input', async () => {
		await renderComponent()

		expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()
	})

	it('should render a create user button', async () => {
		await renderComponent()

		expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument()
	})

	it('should render data table when there is no error', async () => {
		const users = [createMockManagedUser()]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()

		expect(screen.getByRole('table')).toBeInTheDocument()
	})

	it('should render column headers', async () => {
		const users = [createMockManagedUser()]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()

		expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /roles/i })).toBeInTheDocument()
	})

	it('should render user data in the table', async () => {
		const users = [createMockManagedUser({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()

		expect(screen.getByText('John Doe')).toBeInTheDocument()
		expect(screen.getByText('john@example.com')).toBeInTheDocument()
	})

	it('should render user roles as comma-separated list', async () => {
		const users = [
			createMockManagedUser({
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
			}),
		]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()

		expect(screen.getByText('Admin, Editor')).toBeInTheDocument()
	})

	it('should render em dash when user has no roles', async () => {
		const users = [createMockManagedUser({ roles: [] })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()

		expect(screen.getByText('—')).toBeInTheDocument()
	})

	it('opens the row-actions menu and shows the Edit item', async () => {
		const users = [createMockManagedUser()]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
	})

	it('opens the row-actions menu and shows the Delete item', async () => {
		const users = [createMockManagedUser()]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
	})

	it('opens the row-actions menu and shows the Reset Password item', async () => {
		const users = [createMockManagedUser()]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.getByRole('menuitem', { name: /reset password/i })).toBeInTheDocument()
	})

	it('should render alert with error message when hasReadError is true', async () => {
		usersApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('Failed to load users')).toBeInTheDocument()
	})

	it('should not render data table when there is an error', async () => {
		usersApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.queryByRole('table')).not.toBeInTheDocument()
	})

	it('should not render alert when loading', async () => {
		usersApiMock.getAll.mockReturnValue(NEVER)

		await renderComponent()

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('should show confirm dialog when Delete is selected from the row-actions menu', async () => {
		const users = [createMockManagedUser({ id: 1, firstName: 'John', lastName: 'Doe' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
		TestBed.tick()

		expect(screen.getByText(/are you sure you want to delete the user 'John Doe'/i)).toBeInTheDocument()
	})

	it('should call deleteUser when delete is confirmed', async () => {
		const users = [createMockManagedUser({ id: 42, firstName: 'Jane', lastName: 'Smith' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))
		usersApiMock.delete.mockReturnValue(of(undefined))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
		TestBed.tick()

		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /delete/i }))

		expect(usersApiMock.delete.calls).toHaveLength(1)
		expect(usersApiMock.delete.calls[0][0]).toBe(42)
	})

	it('should show confirm dialog when Reset password is selected from the row-actions menu', async () => {
		const users = [createMockManagedUser({ id: 1, email: 'john@example.com' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: /reset password/i }))
		TestBed.tick()

		expect(screen.getByText(/reset the password for 'john@example.com'/i)).toBeInTheDocument()
	})

	it('should call resetPassword when reset is confirmed', async () => {
		const users = [createMockManagedUser({ id: 42, email: 'jane@example.com' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))
		usersApiMock.resetPassword.mockReturnValue(of({ message: 'Password reset successfully' }))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: /reset password/i }))
		TestBed.tick()

		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /reset password/i }))

		expect(usersApiMock.resetPassword.calls).toHaveLength(1)
		expect(usersApiMock.resetPassword.calls[0][0]).toBe(42)
	})

	it('omits Reset password and Delete from the row-actions menu on the self-row', async () => {
		// The current user shares the id of the only row, so destructive items must be hidden
		// even though the user holds admin:users:reset_password and admin:users:delete permissions.
		const users = [createMockManagedUser({ id: 42, email: 'self@example.com' })]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		const view = await render(UsersList, {
			providers: [
				provideRouter([]),
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 42, hasPermission: () => true }))
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()
		await openRowActionsMenu()

		expect(screen.queryByRole('menuitem', { name: /reset password/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
		// Edit remains available — users may update their own profile.
		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
	})

	it('does not render the row-actions trigger on the self-row when every action is gated out for that row', async () => {
		// Current user (id=42) holds only destructive permissions. On the self-row, both Reset
		// password and Delete are blocked by the !isSelf guard; with no Edit permission either,
		// getRowActions returns []. The other row (id=43) still gets a Delete action, so the
		// actions column header renders — but the self-row's cell shows no trigger button.
		const users = [
			createMockManagedUser({ id: 42, email: 'self@example.com' }),
			createMockManagedUser({ id: 43, email: 'other@example.com' }),
		]
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

		const view = await render(UsersList, {
			providers: [
				provideRouter([]),
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({
				id: 42,
				hasPermission: (id: string) => ['admin:users:read', 'admin:users:delete'].includes(id),
			}),
		)
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()

		// Exactly one trigger across both rows (other-row only).
		expect(screen.getAllByRole('button', { name: 'Actions' })).toHaveLength(1)
		// The other-row's row containing 'other@example.com' has the trigger; the self-row does not.
		const selfRow = screen.getByRole('row', { name: /self@example\.com/i })
		const otherRow = screen.getByRole('row', { name: /other@example\.com/i })
		expect(within(selfRow).queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
		expect(within(otherRow).getByRole('button', { name: 'Actions' })).toBeInTheDocument()
	})

	describe('permission-conditional rendering', () => {
		async function renderWithPermissions(allowedPermissions: string[]) {
			const users = [createMockManagedUser()]
			usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse(users)))

			const view = await render(UsersList, {
				providers: [
					provideRouter([]),
					{ provide: UsersApi, useValue: usersApiMock },
					{ provide: RolesApi, useValue: rolesApiMock },
					{ provide: AuthApi, useValue: new InMemoryAuthApi() },
					{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
					{ provide: Translation, useValue: mockTranslation },
					{ provide: BreakpointObserver, useValue: breakpointObserverMock },
				],
			})

			TestBed.inject(AuthStore).updateCurrentUser(
				createMockUser({
					id: 999,
					hasPermission: (id: string) => allowedPermissions.includes(id),
				}),
			)
			TestBed.tick()
			await advanceTimersByTimeAsync(1000)
			view.fixture.detectChanges()
			return view
		}

		it('should hide create button when user lacks users:create', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:update', 'admin:users:delete'])

			expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument()
		})

		it('omits Edit from the row-actions menu when user lacks users:update', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:delete'])
			await openRowActionsMenu()

			expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
		})

		it('omits Delete from the row-actions menu when user lacks users:delete', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:update'])
			await openRowActionsMenu()

			expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
		})

		it('omits Reset password from the row-actions menu when user lacks users:reset_password', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:update', 'admin:users:delete'])
			await openRowActionsMenu()

			expect(screen.queryByRole('menuitem', { name: /reset password/i })).not.toBeInTheDocument()
		})

		it('renders the row-actions trigger when user has only reset_password', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:reset_password'])
			await openRowActionsMenu()

			expect(screen.getByRole('menuitem', { name: /reset password/i })).toBeInTheDocument()
		})

		it('does not render the actions column or trigger when user lacks update, delete, and reset_password', async () => {
			await renderWithPermissions(['admin:users:read', 'admin:users:create'])

			// Empty actions list → component renders nothing → no trigger button.
			expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
			// The `columns()` computed signal must also omit the actions column entirely — verified
			// here by the column count (name, email, status, roles — no fifth "actions" column).
			expect(screen.getAllByRole('columnheader')).toHaveLength(4)
		})
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:create')).toBe(true)
		expect(validIdentifiers.has('admin:users:update')).toBe(true)
		expect(validIdentifiers.has('admin:users:delete')).toBe(true)
		expect(validIdentifiers.has('admin:users:reset_password')).toBe(true)
	})
})
