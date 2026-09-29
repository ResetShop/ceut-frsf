import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { createMockUser } from '@mocks/user.mock'
import { featherActivity, featherHome } from '@ng-icons/feather-icons'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { NavigationSection } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen, within } from '@testing-library/angular'
import { userEvent } from '@testing-library/user-event'
import { Sidebar } from './sidebar'

// Captures initial viewport state only — addEventListener is a no-op so reactive changes are not supported.
function mockMatchMedia(matches: boolean) {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	const noop = () => {}
	const mql = {
		matches,
		media: '(min-width: 1024px)',
		onchange: null,
		addEventListener: noop,
		removeEventListener: noop,
		addListener: noop,
		removeListener: noop,
		dispatchEvent: () => false,
	}
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: () => mql,
	})
	return mql
}

// happy-dom does not implement window.matchMedia. BreakpointObserver reads it during
// class field init (before beforeEach runs), so the mock must be installed at module scope.
mockMatchMedia(true)

describe('Sidebar', () => {
	beforeEach(() => {
		clearAllMocks()
		mockMatchMedia(true)
	})

	const defaultProviders = () => [
		provideRouter([
			{ path: 'auth/login', component: Sidebar },
			{ path: 'health', component: Sidebar },
			{ path: 'admin/users', component: Sidebar },
			{ path: 'admin/settings', component: Sidebar },
		]),
		provideMockTheme(false),
		provideHttpClient(),
		provideHttpClientTesting(),
		provideAuthMock(),
		NavigationState,
		provideTranslationMock(),
	]

	const createNavigationWithSections = (sections: NavigationSection[]) => ({
		provide: Navigation,
		useValue: {
			sections: () => sections,
			breadcrumbs: () => [],
		},
	})

	const ada = createMockUser({
		firstName: 'Ada',
		lastName: 'Lovelace',
		fullName: 'Ada Lovelace',
		email: 'ada@example.com',
	})

	function signIn(user = ada): void {
		TestBed.inject(AuthStore).updateCurrentUser(user)
		TestBed.tick()
	}

	function userTile(): HTMLElement {
		return screen.getByRole('button', { name: 'Ada Lovelace' })
	}

	const mockSettingsSection: NavigationSection = {
		id: 'settings',
		name: 'Ajustes y mantenimiento',
		routes: [
			{
				id: 'health',
				name: 'Salud',
				route: 'health',
				icon: { featherActivity: featherActivity },
			},
		],
	}

	const mockAdminSection: NavigationSection = {
		id: 'admin',
		name: 'Administración',
		routes: [
			{
				id: 'users',
				name: 'Gestión de usuarios',
				route: 'admin/users',
				icon: { featherHome: featherHome },
			},
			{
				id: 'settings',
				name: 'Configuración del sistema',
				route: 'admin/settings',
				icon: { featherActivity: featherActivity },
			},
		],
	}

	it('should render the sidebar with navigation sections', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
		})

		expect(screen.getByText('Ajustes y mantenimiento')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /salud/i })).toBeInTheDocument()
	})

	it('should display navigation section titles', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
		})

		const sectionTitle = screen.getByText('Ajustes y mantenimiento')
		expect(sectionTitle).toBeInTheDocument()
	})

	it('should render navigation route links with correct text', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
		})

		const healthLink = screen.getByRole('link', { name: /salud/i })
		expect(healthLink).toBeInTheDocument()
	})

	it('should have correct route on navigation items', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
		})

		const healthLink = screen.getByRole('link', { name: /salud/i })
		expect(healthLink).toHaveAttribute('href', '/health')
	})

	it('should render multiple navigation sections with different content', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection, mockAdminSection])],
		})

		expect(screen.getByText('Ajustes y mantenimiento')).toBeInTheDocument()
		expect(screen.getByText('Administración')).toBeInTheDocument()

		const adminUsersLink = screen.getByRole('link', { name: /gestión de usuarios/i })
		expect(adminUsersLink).toBeInTheDocument()
		expect(adminUsersLink).toHaveAttribute('href', '/admin/users')
	})

	it('should render brand component at the top of sidebar', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
		})

		// Verify Brand component is rendered by looking for its unique "Reset Starter Repo" link
		const brandLink = screen.getByRole('link', { name: /reset starter repo/i })
		expect(brandLink).toBeInTheDocument()

		// Verify it has the correct routing to the dashboard page
		expect(brandLink).toHaveAttribute('href', '/dashboard')
	})

	it('should have proper structure with all sections and the user tile', async () => {
		await render(Sidebar, {
			providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection, mockAdminSection])],
		})
		signIn()

		expect(screen.getByText('Ajustes y mantenimiento')).toBeInTheDocument()
		expect(screen.getByText('Administración')).toBeInTheDocument()
		expect(userTile()).toBeInTheDocument()
	})

	describe('always expanded on wide screens', () => {
		it('offers no control to collapse the sidebar', async () => {
			mockMatchMedia(true)

			await render(Sidebar, {
				providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
			})

			expect(screen.queryByRole('button', { name: /collapse sidebar|expand sidebar/i })).toBeNull()
		})

		it('keeps the labels and the user tile when Ctrl+B or Cmd+B is pressed', async () => {
			mockMatchMedia(true)
			const user = userEvent.setup()

			await render(Sidebar, {
				providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
			})

			signIn()
			await user.keyboard('{Control>}b{/Control}')
			await user.keyboard('{Meta>}b{/Meta}')

			expect(screen.getByText('Ajustes y mantenimiento')).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /reset starter repo/i })).toBeInTheDocument()
			expect(within(userTile()).getByText('Ada Lovelace')).toBeInTheDocument()
		})
	})

	describe('user menu', () => {
		async function renderSignedIn() {
			const view = await render(Sidebar, {
				providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
			})
			signIn()
			return view
		}

		async function openUserMenu(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
			await user.click(userTile())
			TestBed.tick()
			return screen.getByRole('menu')
		}

		it('replaces the footer Logout button with the signed-in user’s tile', async () => {
			await renderSignedIn()

			expect(within(userTile()).getByText('Ada Lovelace')).toBeInTheDocument()
			expect(within(userTile()).getByText('ada@example.com')).toBeInTheDocument()
			expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument()
		})

		it('shows initials from the first and last name', async () => {
			await renderSignedIn()

			expect(within(userTile()).getByText('AL')).toBeInTheDocument()
		})

		it('falls back to a single initial when the last name is empty', async () => {
			await render(Sidebar, {
				providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
			})
			signIn(createMockUser({ firstName: 'Ada', lastName: '', fullName: 'Ada', email: 'ada@example.com' }))

			expect(within(screen.getByRole('button', { name: 'Ada' })).getByText('A')).toBeInTheDocument()
		})

		it('renders nothing for the user while nobody is signed in', async () => {
			await render(Sidebar, {
				providers: [...defaultProviders(), createNavigationWithSections([mockSettingsSection])],
			})

			expect(screen.queryByRole('button', { name: 'Ada Lovelace' })).not.toBeInTheDocument()
		})

		it('links to the Account and Settings pages and offers logging out', async () => {
			const user = userEvent.setup()
			await renderSignedIn()

			const menu = await openUserMenu(user)

			expect(within(menu).getByRole('menuitem', { name: 'Account' })).toHaveAttribute('href', '/account')
			expect(within(menu).getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/dashboard/settings')
			expect(within(menu).getByRole('menuitem', { name: 'Logout' })).toHaveAttribute('type', 'button')

			await user.keyboard('{Escape}')
			TestBed.tick()
		})

		it('logs out from the menu and routes to the login page', async () => {
			const user = userEvent.setup()
			const { fixture } = await renderSignedIn()

			await openUserMenu(user)
			await user.click(screen.getByRole('menuitem', { name: 'Logout' }))
			await fixture.whenStable()
			TestBed.tick()

			expect(TestBed.inject(AuthStore).currentUser()).toBeNull()
			expect(TestBed.inject(Router).url).toBe('/auth/login')
		})

		it('opens the menu beside the tile on wide screens', async () => {
			mockMatchMedia(true)
			await renderSignedIn()

			expect(userTile()).toHaveAttribute('data-placement', 'right-end')
		})

		it('opens the menu upwards in the narrow mobile drawer', async () => {
			mockMatchMedia(false)
			await renderSignedIn()

			expect(userTile()).toHaveAttribute('data-placement', 'top')
		})
	})
})
