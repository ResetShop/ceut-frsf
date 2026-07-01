import { signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { BreadcrumbItem } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { UIStore } from '@store/ui/ui.store'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { Header } from './header'

describe('Header', () => {
	const mockToggleSidebar = fn()

	const mockUIStore = {
		toggleSidebar: mockToggleSidebar,
		isSidebarOpen: signal(false),
	}

	beforeEach(() => {
		clearAllMocks()
	})

	const defaultProviders = () => [
		provideTranslationMock(),
		provideRouter([]),
		provideMockTheme(false),
		{ provide: UIStore, useValue: mockUIStore },
	]

	const createNavigationWithBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => ({
		provide: Navigation,
		useValue: {
			breadcrumbs: () => breadcrumbs,
			sections: () => [],
		},
	})

	it('should render header component with breadcrumb', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Settings', path: '/settings', isActive: true },
		]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()
	})

	it('should render breadcrumb navigation element with accessibility attributes', async () => {
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', path: '/dashboard', isActive: true }]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(breadcrumbNav).toBeInTheDocument()
		expect(breadcrumbNav).toHaveAttribute('aria-label', 'Breadcrumb')
	})

	it('should display breadcrumbs from complex route hierarchy', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Admin', path: '/admin', isActive: false },
			{ title: 'Dashboard', path: '/admin/dashboard', isActive: true },
		]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
		expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin')
		expect(screen.getByText('Dashboard')).toHaveAttribute('aria-current', 'page')
	})

	it('should have proper semantic structure', async () => {
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()
		expect(nav.tagName).toBe('NAV')
	})

	it('should render breadcrumb with proper list structure', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Profile', path: '/profile', isActive: true },
		]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const list = screen.getByRole('list')
		expect(list).toBeInTheDocument()
	})

	it('should integrate breadcrumb component with multiple nested levels', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Products', path: '/products', isActive: false },
			{ title: 'Electronics', path: '/products/electronics', isActive: false },
			{ title: 'Laptops', path: '/products/electronics/laptops', isActive: true },
		]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(breadcrumb).toBeInTheDocument()

		const links = screen.getAllByRole('link')
		expect(links).toHaveLength(3)
		expect(screen.getByText('Laptops')).toHaveAttribute('aria-current', 'page')
	})

	it('should render breadcrumb with correct styling classes', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Current', path: '/current', isActive: true },
		]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toHaveClass('flex', 'items-center', 'gap-1')
	})

	it('should handle single breadcrumb item gracefully', async () => {
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()

		const links = screen.queryAllByRole('link')
		expect(links).toHaveLength(0)

		expect(screen.getByText('Home')).toHaveAttribute('aria-current', 'page')
	})

	it('should render hamburger button for mobile navigation', async () => {
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
		expect(hamburger).toBeInTheDocument()
	})

	it('should call toggleSidebar when hamburger button is clicked', async () => {
		const user = userEvent.setup()
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

		await render(Header, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
		await user.click(hamburger)

		expect(mockToggleSidebar.calls).toHaveLength(1)
	})
})
