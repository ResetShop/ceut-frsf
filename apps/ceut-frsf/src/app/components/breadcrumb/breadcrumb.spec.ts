import { provideRouter } from '@angular/router'
import { Breadcrumb } from '@components/breadcrumb/breadcrumb'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { BreadcrumbItem } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { render, screen } from '@testing-library/angular'

describe('Breadcrumb', () => {
	const defaultProviders = () => [provideTranslationMock(), provideRouter([])]

	const createNavigationWithBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => ({
		provide: Navigation,
		useValue: {
			breadcrumbs: () => breadcrumbs,
			sections: () => [],
		},
	})

	it('should render breadcrumb navigation element with semantic structure', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Settings', path: '/settings', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()

		const list = screen.getByRole('list')
		expect(list).toBeInTheDocument()
	})

	it('should display single breadcrumb item as active when only one exists', async () => {
		const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const currentPage = screen.getByText('Home')
		expect(currentPage).toHaveAttribute('aria-current', 'page')
	})

	it('should mark last breadcrumb as active and others as inactive links', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Dashboard', path: '/dashboard', isActive: false },
			{ title: 'Settings', path: '/settings', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const homeLink = screen.getByRole('link', { name: /home/i })
		expect(homeLink).toHaveAttribute('href', '/')

		const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
		expect(dashboardLink).toHaveAttribute('href', '/dashboard')

		const settingsSpan = screen.getByText('Settings')
		expect(settingsSpan).toHaveAttribute('aria-current', 'page')
	})

	it('should render navigation items with multiple breadcrumb levels', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Admin', path: '/admin', isActive: false },
			{ title: 'Users', path: '/admin/users', isActive: false },
			{ title: 'User Details', path: '/admin/users/123', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const links = screen.getAllByRole('link')
		expect(links).toHaveLength(3)
		expect(links[0]).toHaveAttribute('href', '/')
		expect(links[1]).toHaveAttribute('href', '/admin')
		expect(links[2]).toHaveAttribute('href', '/admin/users')

		const currentPage = screen.getByText('User Details')
		expect(currentPage).toHaveAttribute('aria-current', 'page')
	})

	it('should display breadcrumb with special characters in titles', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home & Dashboard', path: '/', isActive: false },
			{ title: 'User Settings (Admin)', path: '/settings', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		expect(screen.getByText(/Home & Dashboard/)).toBeInTheDocument()
		expect(screen.getByText(/User Settings \(Admin\)/)).toBeInTheDocument()
	})

	it('should render separator icons between breadcrumb items', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Settings', path: '/settings', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const separators = screen.getAllByRole('listitem')
		expect(separators.length).toBeGreaterThan(2)
	})

	it('should have proper accessibility attributes for navigation', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Products', path: '/products', isActive: false },
			{ title: 'Electronics', path: '/products/electronics', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
		expect(nav).toHaveClass('flex', 'items-center', 'gap-1')
	})

	it('should apply correct styling to active breadcrumb item', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Current Page', path: '/current', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const currentPage = screen.getByText('Current Page')
		expect(currentPage).toHaveClass('text-sm', 'font-medium', 'text-foreground')
	})

	it('should apply correct styling to inactive breadcrumb links', async () => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ title: 'Home', path: '/', isActive: false },
			{ title: 'Current', path: '/current', isActive: true },
		]

		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
		})

		const homeLink = screen.getByRole('link', { name: /home/i })
		expect(homeLink).toHaveClass('text-sm', 'font-medium', 'text-muted-foreground')
		expect(homeLink).toHaveClass('hover:text-foreground')
	})

	it('should handle empty breadcrumbs gracefully', async () => {
		await render(Breadcrumb, {
			providers: [...defaultProviders(), createNavigationWithBreadcrumbs([])],
		})

		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()

		const listItems = screen.queryAllByRole('listitem')
		expect(listItems).toHaveLength(0)
	})

	describe('intermediate-item hiding below sm:', () => {
		// jsdom cannot evaluate media queries. These tests assert the class-presence regression guard
		// for the sm: viewport-aware visibility rules. Visual behaviour is covered by the
		// `MobileEllipsis` Storybook story at 375 px.

		it('should not render an ellipsis when the trail has 1 item', async () => {
			const breadcrumbs: BreadcrumbItem[] = [{ title: 'Home', path: '/', isActive: true }]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			expect(screen.queryByText('…')).not.toBeInTheDocument()
		})

		it('should not render an ellipsis when the trail has 2 items', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			expect(screen.queryByText('…')).not.toBeInTheDocument()
		})

		it('should render an ellipsis marked sm:hidden when the trail has 3+ items', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Admin', path: '/admin', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			expect(screen.getByText('…')).toBeInTheDocument()

			// Entries for a 3-item chain: [Home, ›, …, ›, Admin, ›, Settings].
			// Indices: 0 Home (all), 1 › (all), 2 … (mobile), 3 › (mobile),
			//          4 Admin (desktop), 5 › (desktop), 6 Settings (all).
			const items = screen.getAllByRole('listitem')

			// Ellipsis and the chevron after it are mobile-only.
			expect(items[2]).toHaveClass('sm:hidden')
			expect(items[3]).toHaveClass('sm:hidden')

			// The single intermediate item (Admin) and its trailing chevron are desktop-only.
			expect(items[4]).toHaveClass('hidden')
			expect(items[4]).toHaveClass('sm:inline-flex')
			expect(items[5]).toHaveClass('hidden')
			expect(items[5]).toHaveClass('sm:inline-flex')
		})

		it('should mark intermediate items hidden sm:inline-flex when the trail has 4 items', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Admin', path: '/admin', isActive: false },
				{ title: 'Users', path: '/admin/users', isActive: false },
				{ title: 'User Details', path: '/admin/users/123', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			// Entries for a 4-item chain: [Home, ›, …, ›, Admin, ›, Users, ›, User Details].
			// Indices: 0 Home (all), 1 › (all), 2 … (mobile), 3 › (mobile),
			//          4 Admin (desktop), 5 › (desktop), 6 Users (desktop), 7 › (desktop),
			//          8 User Details (all).
			const items = screen.getAllByRole('listitem')

			// Mobile-only entries: ellipsis and the chevron after it.
			expect(items[2]).toHaveClass('sm:hidden')
			expect(items[3]).toHaveClass('sm:hidden')

			// Intermediate items (Admin, Users) and their trailing chevrons are CSS-hidden on mobile.
			expect(items[4]).toHaveClass('hidden')
			expect(items[4]).toHaveClass('sm:inline-flex')
			expect(items[6]).toHaveClass('hidden')
			expect(items[6]).toHaveClass('sm:inline-flex')

			// First and last entries stay visible at all viewports.
			expect(items[0]).not.toHaveClass('hidden')
			expect(items[8]).not.toHaveClass('hidden')
		})
	})

	describe('mobile segment truncation', () => {
		// jsdom cannot evaluate media queries. These tests assert the class-presence regression guard
		// for the per-segment truncation rules that keep the breadcrumb within the 64px header on
		// mobile. Visual behaviour is covered by the `MobileLongSegments` Storybook story at 375 px.

		it('should apply min-w-0 to the nav element so it can shrink inside the header flex row', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
			expect(nav).toHaveClass('min-w-0')
		})

		it('should apply min-w-0 to the ol and remove flex-wrap so segments stay on one line', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const list = screen.getByRole('list')
			expect(list).toHaveClass('min-w-0')
			expect(list).not.toHaveClass('flex-wrap')
		})

		it('should apply min-w-0 to every li on a 2-item chain', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const items = screen.getAllByRole('listitem')
			for (const item of items) {
				expect(item).toHaveClass('min-w-0')
			}
		})

		it('should apply min-w-0 to every li on a 4-item chain (ellipsis path)', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Admin', path: '/admin', isActive: false },
				{ title: 'Users', path: '/admin/users', isActive: false },
				{ title: 'User Details', path: '/admin/users/123', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const items = screen.getAllByRole('listitem')
			for (const item of items) {
				expect(item).toHaveClass('min-w-0')
			}
		})

		it('should apply truncate and max-w-[8rem] sm:max-w-none to inactive links', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const homeLink = screen.getByRole('link', { name: /home/i })
			expect(homeLink).toHaveClass('truncate', 'max-w-[8rem]', 'sm:max-w-none')
		})

		it('should not duplicate the inactive link label via a title attribute', async () => {
			// The full label remains the link's accessible name via its text content; adding `title`
			// would cause some screen reader + browser combinations to announce the label twice.
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Settings', path: '/settings', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const homeLink = screen.getByRole('link', { name: /home/i })
			expect(homeLink).not.toHaveAttribute('title')
		})

		it('should apply truncate and max-w-[14rem] sm:max-w-none to the active span', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Current Page', path: '/current', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const activeSpan = screen.getByText('Current Page', { selector: 'span[aria-current="page"]' })
			expect(activeSpan).toHaveClass('truncate', 'max-w-[14rem]', 'sm:max-w-none')
		})

		it('should expose the full label of the active span via the title attribute', async () => {
			const breadcrumbs: BreadcrumbItem[] = [
				{ title: 'Home', path: '/', isActive: false },
				{ title: 'Current Page', path: '/current', isActive: true },
			]

			await render(Breadcrumb, {
				providers: [...defaultProviders(), createNavigationWithBreadcrumbs(breadcrumbs)],
			})

			const activeSpan = screen.getByText('Current Page', { selector: 'span[aria-current="page"]' })
			expect(activeSpan).toHaveAttribute('title', 'Current Page')
		})
	})
})
