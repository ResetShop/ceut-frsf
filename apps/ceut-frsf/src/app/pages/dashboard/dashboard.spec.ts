import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import { featherActivity } from '@ng-icons/feather-icons'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import type { BreadcrumbItem, NavigationSection } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { UIStore } from '@store/ui/ui.store'
import type { UINotification } from '@store/ui/ui.types'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import Dashboard from './dashboard'

describe('Dashboard', () => {
	const mockGlobalLoading = signal(false)
	const mockSidebarCollapsed = signal(false)
	const mockSidebarOpen = signal(false)

	const mockNotifications = signal<UINotification[]>([])

	const mockUIStore = {
		isGlobalLoading: mockGlobalLoading,
		setGlobalLoading: (value: boolean) => mockGlobalLoading.set(value),
		notifications: mockNotifications,
		dismissNotification: fn(),
		isSidebarCollapsed: mockSidebarCollapsed,
		setSidebarCollapsed: (value: boolean) => mockSidebarCollapsed.set(value),
		isSidebarOpen: mockSidebarOpen,
		setSidebarOpen: (value: boolean) => mockSidebarOpen.set(value),
		toggleSidebar: () => mockSidebarOpen.update((v) => !v),
	}

	const defaultProviders = () => [
		provideRouter([
			{ path: 'auth/login', component: Dashboard },
			{ path: 'health', component: Dashboard },
		]),
		provideMockTheme(false),
		provideHttpClient(),
		provideHttpClientTesting(),
		provideAuthMock(),
		NavigationState,
		{ provide: UIStore, useValue: mockUIStore },
		provideTranslationMock(),
	]

	const createNavigationWithSectionsAndBreadcrumbs = (
		sections: NavigationSection[],
		breadcrumbs: BreadcrumbItem[],
	) => ({
		provide: Navigation,
		useValue: {
			sections: () => sections,
			breadcrumbs: () => breadcrumbs,
		},
	})

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

	const mockBreadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', path: '/dashboard', isActive: true }]

	beforeEach(() => {
		clearAllMocks()
		mockGlobalLoading.set(false)
		mockSidebarCollapsed.set(false)
		mockSidebarOpen.set(false)
	})

	it('should render the dashboard component with sidebar and header', async () => {
		const { fixture } = await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render the sidebar with navigation sections', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const sidebar = screen.getByRole('complementary')
		expect(sidebar).toBeInTheDocument()

		expect(screen.getByText('Ajustes y mantenimiento')).toBeInTheDocument()
	})

	it('should render main content area', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const main = screen.getByRole('main')
		expect(main).toBeInTheDocument()
	})

	it('should render header with breadcrumb navigation', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(breadcrumb).toBeInTheDocument()
	})

	it('should have proper layout structure with grid areas', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const sidebar = screen.getByRole('complementary')
		const header = screen.getByRole('navigation', { name: /breadcrumb/i })
		const main = screen.getByRole('main')

		expect(sidebar).toBeInTheDocument()
		expect(header).toBeInTheDocument()
		expect(main).toBeInTheDocument()
	})

	it('should render router outlet for nested routes', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const main = screen.getByRole('main')
		expect(main).toBeInTheDocument()
	})

	it('should render sign out button in sidebar', async () => {
		await render(Dashboard, {
			providers: [
				...defaultProviders(),
				createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
			],
		})

		const signOutButton = screen.getByRole('button', { name: /Logout/i })
		expect(signOutButton).toBeInTheDocument()
	})

	describe('mobile backdrop overlay', () => {
		it('should not render backdrop when sidebar is closed', async () => {
			await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})

			expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
		})

		it('should render backdrop when sidebar is open on mobile', async () => {
			mockSidebarOpen.set(true)

			const { fixture } = await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})
			fixture.detectChanges()

			expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()
		})

		it('should close sidebar when backdrop is clicked', async () => {
			mockSidebarOpen.set(true)
			const user = userEvent.setup()

			const { fixture } = await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})
			fixture.detectChanges()

			await user.click(screen.getByTestId('sidebar-backdrop'))

			expect(mockSidebarOpen()).toBe(false)
		})

		it('should remove backdrop after sidebar is closed', async () => {
			mockSidebarOpen.set(true)

			const { fixture } = await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})
			fixture.detectChanges()

			expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument()

			mockSidebarOpen.set(false)
			fixture.detectChanges()

			expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
		})
	})

	describe('global loading overlay', () => {
		it('should not render loading overlay when isGlobalLoading is false', async () => {
			await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})

			expect(screen.queryByRole('status')).not.toBeInTheDocument()
		})

		it('should render loading overlay when isGlobalLoading is true', async () => {
			mockGlobalLoading.set(true)

			const { fixture } = await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})
			fixture.detectChanges()

			expect(screen.getByRole('status')).toBeInTheDocument()
		})

		it('should hide loading overlay when isGlobalLoading is set back to false', async () => {
			mockGlobalLoading.set(true)

			const { fixture } = await render(Dashboard, {
				providers: [
					...defaultProviders(),
					createNavigationWithSectionsAndBreadcrumbs([mockSettingsSection], mockBreadcrumbs),
				],
			})
			fixture.detectChanges()
			expect(screen.getByRole('status')).toBeInTheDocument()

			mockGlobalLoading.set(false)
			fixture.detectChanges()
			expect(screen.queryByRole('status')).not.toBeInTheDocument()
		})
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:read')).toBe(true)
		expect(validIdentifiers.has('admin:permissions:read')).toBe(true)
		expect(validIdentifiers.has('admin:roles:read')).toBe(true)
	})
})
