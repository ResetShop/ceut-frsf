import { BreakpointObserver } from '@angular/cdk/layout'
import { TestBed } from '@angular/core/testing'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { PermissionsApi } from '@providers/permissions/permissions.interface'
import { RolesApi } from '@providers/roles/roles.interface'
import { createMockRoleData } from '@providers/roles/roles.mock'
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
import RolesList from './roles-list'

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

describe('RolesList', () => {
	let rolesApiMock: Record<keyof RolesApi, MockFn>
	let permissionsApiMock: Record<keyof PermissionsApi, MockFn>
	let breakpointObserverMock: { observe: MockFn }

	beforeEach(() => {
		clearAllMocks()
		useFakeTimers()
		spyOn(console, 'error')

		rolesApiMock = {
			getAll: fn(),
			getAllUnpaginated: fn(),
			getByIdWithPermissions: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			assignPermissions: fn(),
		}

		permissionsApiMock = {
			getAllUnpaginated: fn(),
		}

		breakpointObserverMock = {
			observe: fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
		}

		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of([]))
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of([]))
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
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ hasPermission: () => true }))
	}

	async function renderComponent() {
		const view = await render(RolesList, {
			providers: [
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
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
		rolesApiMock.getAll.mockReturnValue(NEVER)

		await render(RolesList, {
			providers: [
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		setUserWithAllPermissions()
		TestBed.tick()

		expect(screen.getByTestId('roles-actions-skeleton')).toBeInTheDocument()
		expect(screen.queryByPlaceholderText(/search roles/i)).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /create role/i })).not.toBeInTheDocument()
	})

	describe('drawer responsive width classes', () => {
		// Regression guard for the CRUD drawer responsive width classes. The panel must be full-width
		// below the `sm:` breakpoint and pinned to 512 px from `sm:` up (`w-full sm:w-lg`). The consumer
		// class is merged into `<dialog>` via the DrawerPanel directive's `panelClasses` computed.

		it('should apply w-full sm:w-lg to the Create Role drawer dialog', async () => {
			await renderComponent()

			fireEvent.click(screen.getByRole('button', { name: /create role/i }))
			TestBed.tick()

			const dialog = screen.getByRole('dialog', { name: /create role/i })
			expect(dialog).toHaveClass('w-full')
			expect(dialog).toHaveClass('sm:w-lg')
		})

		it('should apply w-full sm:w-lg to the Edit Role drawer dialog', async () => {
			const roles = [createMockRoleData({ id: 1, name: 'Admin', code: 'admin' })]
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))
			rolesApiMock.getByIdWithPermissions.mockReturnValue(of({ ...roles[0], permissions: [] }))

			await renderComponent()
			await openRowActionsMenu()

			fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
			TestBed.tick()

			const dialog = screen.getByRole('dialog', { name: /edit role/i })
			expect(dialog).toHaveClass('w-full')
			expect(dialog).toHaveClass('sm:w-lg')
		})
	})

	describe('responsive action bar classes', () => {
		// jsdom cannot evaluate media queries; assert class-presence as a regression guard for the
		// mobile-first stacking rule. Visual breakpoint behaviour is covered by Storybook stories.

		it('should stack the loading skeleton vertically below sm: and side-by-side from sm: up', async () => {
			rolesApiMock.getAll.mockReturnValue(NEVER)

			await render(RolesList, {
				providers: [
					{ provide: RolesApi, useValue: rolesApiMock },
					{ provide: PermissionsApi, useValue: permissionsApiMock },
					{ provide: AuthApi, useValue: new InMemoryAuthApi() },
					{ provide: Translation, useValue: mockTranslation },
					{ provide: BreakpointObserver, useValue: breakpointObserverMock },
				],
			})
			setUserWithAllPermissions()
			TestBed.tick()

			const skeleton = screen.getByTestId('roles-actions-skeleton')
			expect(skeleton).toHaveClass('flex-col')
			expect(skeleton).toHaveClass('sm:flex-row')
		})

		it('should mark the Create Role button full-width on mobile and auto-width from sm: up', async () => {
			await renderComponent()

			const createButton = screen.getByRole('button', { name: /create role/i })
			expect(createButton).toHaveClass('w-full')
			expect(createButton).toHaveClass('sm:w-auto')
		})
	})

	it('should show real actions after loading completes', async () => {
		await renderComponent()

		expect(screen.queryByTestId('roles-actions-skeleton')).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText(/search roles/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument()
	})

	it('should render the page heading', async () => {
		await renderComponent()

		expect(screen.getByRole('heading', { name: /roles/i })).toBeInTheDocument()
	})

	it('should render the description text', async () => {
		await renderComponent()

		expect(screen.getByText(/manage system roles/i)).toBeInTheDocument()
	})

	it('should render a search input', async () => {
		await renderComponent()

		expect(screen.getByPlaceholderText(/search roles/i)).toBeInTheDocument()
	})

	it('should render a create role button', async () => {
		await renderComponent()

		expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument()
	})

	it('should render data table when there is no error', async () => {
		const roles = [createMockRoleData()]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()

		expect(screen.getByRole('table')).toBeInTheDocument()
	})

	it('should render column headers', async () => {
		const roles = [createMockRoleData()]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()

		expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /code/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument()
	})

	it('should render role data in the table', async () => {
		const roles = [createMockRoleData({ id: 1, name: 'Admin', code: 'admin', description: 'Administrator role' })]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()

		expect(screen.getByText('Admin')).toBeInTheDocument()
		expect(screen.getByText('admin')).toBeInTheDocument()
		expect(screen.getByText('Administrator role')).toBeInTheDocument()
	})

	it('opens the row-actions menu and shows the Edit item', async () => {
		const roles = [createMockRoleData()]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
	})

	it('opens the row-actions menu and shows the Delete item for removable roles', async () => {
		const roles = [createMockRoleData({ removable: true })]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
	})

	it('omits Delete from the row-actions menu for non-removable roles', async () => {
		const roles = [createMockRoleData({ removable: false })]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()
		await openRowActionsMenu()

		expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
	})

	it('does not render the row-actions trigger on a non-removable row when user lacks update', async () => {
		// User holds only admin:roles:delete. The removable row gets Delete; the non-removable
		// row has both actions gated out (Edit by missing update permission, Delete by removable:false),
		// so getRowActions returns []. Actions column header still renders because the other row has
		// an action — but the non-removable row's cell shows no trigger button.
		const roles = [
			createMockRoleData({ id: 1, name: 'Removable', removable: true }),
			createMockRoleData({ id: 2, name: 'Locked', removable: false }),
		]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		const view = await render(RolesList, {
			providers: [
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({
				hasPermission: (id: string) => ['admin:roles:read', 'admin:roles:delete'].includes(id),
			}),
		)
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()

		// Exactly one trigger across both rows (removable only).
		expect(screen.getAllByRole('button', { name: 'Actions' })).toHaveLength(1)
		const removableRow = screen.getByRole('row', { name: /removable/i })
		const lockedRow = screen.getByRole('row', { name: /locked/i })
		expect(within(removableRow).getByRole('button', { name: 'Actions' })).toBeInTheDocument()
		expect(within(lockedRow).queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
	})

	it('should render alert with error message when hasReadError is true', async () => {
		rolesApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('Failed to load roles')).toBeInTheDocument()
	})

	it('should not render data table when there is an error', async () => {
		rolesApiMock.getAll.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.queryByRole('table')).not.toBeInTheDocument()
	})

	it('should not render alert when loading', async () => {
		rolesApiMock.getAll.mockReturnValue(NEVER)

		await renderComponent()

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('should show confirm dialog when Delete is selected from the row-actions menu', async () => {
		const roles = [createMockRoleData({ id: 1, name: 'TestRole', removable: true })]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
		TestBed.tick()

		expect(screen.getByText(/are you sure you want to delete the role 'TestRole'/i)).toBeInTheDocument()
	})

	it('should call deleteRole when delete is confirmed', async () => {
		const roles = [createMockRoleData({ id: 42, name: 'TestRole', removable: true })]
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))
		rolesApiMock.delete.mockReturnValue(of(undefined))

		await renderComponent()
		await openRowActionsMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
		TestBed.tick()

		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /delete/i }))

		expect(rolesApiMock.delete.calls).toHaveLength(1)
		expect(rolesApiMock.delete.calls[0][0]).toBe(42)
	})

	describe('permission-conditional rendering', () => {
		async function renderWithPermissions(allowedPermissions: string[]) {
			const roles = [createMockRoleData({ removable: true })]
			rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse(roles)))

			const view = await render(RolesList, {
				providers: [
					{ provide: RolesApi, useValue: rolesApiMock },
					{ provide: PermissionsApi, useValue: permissionsApiMock },
					{ provide: AuthApi, useValue: new InMemoryAuthApi() },
					{ provide: Translation, useValue: mockTranslation },
					{ provide: BreakpointObserver, useValue: breakpointObserverMock },
				],
			})

			TestBed.inject(AuthStore).updateCurrentUser(
				createMockUser({
					hasPermission: (id: string) => allowedPermissions.includes(id),
				}),
			)
			TestBed.tick()
			await advanceTimersByTimeAsync(1000)
			view.fixture.detectChanges()
			return view
		}

		it('should hide create button when user lacks roles:create', async () => {
			await renderWithPermissions(['admin:roles:read', 'admin:roles:update', 'admin:roles:delete'])

			expect(screen.queryByRole('button', { name: /create role/i })).not.toBeInTheDocument()
		})

		it('omits Edit from the row-actions menu when user lacks roles:update', async () => {
			await renderWithPermissions(['admin:roles:read', 'admin:roles:delete'])
			await openRowActionsMenu()

			expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
		})

		it('omits Delete from the row-actions menu when user lacks roles:delete', async () => {
			await renderWithPermissions(['admin:roles:read', 'admin:roles:update'])
			await openRowActionsMenu()

			expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
		})

		it('does not render the actions column or trigger when user lacks both update and delete', async () => {
			await renderWithPermissions(['admin:roles:read', 'admin:roles:create'])

			// Empty actions list → component renders nothing → no trigger button.
			expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
			// The `columns()` computed signal must also omit the actions column entirely — verified
			// here by the column count (name, code, description — no fourth "actions" column).
			expect(screen.getAllByRole('columnheader')).toHaveLength(3)
		})
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:roles:create')).toBe(true)
		expect(validIdentifiers.has('admin:roles:update')).toBe(true)
		expect(validIdentifiers.has('admin:roles:delete')).toBe(true)
	})
})
