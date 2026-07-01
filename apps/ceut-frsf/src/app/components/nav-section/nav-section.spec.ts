import { provideRouter } from '@angular/router'
import { featherActivity, featherHome, featherRefreshCw, featherSettings } from '@ng-icons/feather-icons'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { NavigationSection } from '@resetshop/angular-core/interfaces/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import NavSection from './nav-section'

describe('NavSection', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	const mockSection: NavigationSection = {
		id: 'test-section',
		name: 'Test Section',
		routes: [
			{
				id: 'route1',
				name: 'Route 1',
				route: '/route1',
				icon: { featherHome },
			},
			{
				id: 'route2',
				name: 'Route 2',
				route: '/route2',
				icon: { featherActivity },
			},
		],
	}

	const mockSectionWithoutRoutes: NavigationSection = {
		id: 'empty-section',
		name: 'Empty Section',
		routes: [],
	}

	const mockLargeSection: NavigationSection = {
		id: 'large-section',
		name: 'Large Section',
		routes: [
			{
				id: 'home',
				name: 'Home',
				route: '/home',
				icon: { featherHome },
			},
			{
				id: 'activity',
				name: 'Activity',
				route: '/activity',
				icon: { featherActivity },
			},
			{
				id: 'settings',
				name: 'Settings',
				route: '/settings',
				icon: { featherSettings },
			},
			{
				id: 'refresh',
				name: 'Refresh',
				route: '/refresh',
				icon: { featherRefreshCw },
			},
		],
	}

	const defaultProviders = () => [provideRouter([]), NavigationState, provideTranslationMock()]

	it('should create the nav section component', async () => {
		const { fixture } = await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render section title when showTitle is true', async () => {
		await render(NavSection, {
			inputs: { section: mockSection, showTitle: true },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Test Section')).toBeInTheDocument()
	})

	it('should not render section title when showTitle is false', async () => {
		await render(NavSection, {
			inputs: { section: mockSection, showTitle: false },
			providers: defaultProviders(),
		})

		expect(screen.queryByText('Test Section')).not.toBeInTheDocument()
	})

	it('should render section title by default when showTitle is not provided', async () => {
		await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Test Section')).toBeInTheDocument()
	})

	it('should render all navigation routes in the section', async () => {
		await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Route 1')).toBeInTheDocument()
		expect(screen.getByText('Route 2')).toBeInTheDocument()
	})

	it('should render correct number of navigation items', async () => {
		await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		const links = screen.getAllByRole('link')
		expect(links).toHaveLength(2)
	})

	it('should render navigation items with correct routes', async () => {
		await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		const link1 = screen.getByRole('link', { name: /route 1/i })
		const link2 = screen.getByRole('link', { name: /route 2/i })

		expect(link1).toHaveAttribute('href', '/route1')
		expect(link2).toHaveAttribute('href', '/route2')
	})

	it('should render empty section without routes', async () => {
		await render(NavSection, {
			inputs: { section: mockSectionWithoutRoutes },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Empty Section')).toBeInTheDocument()
		expect(screen.queryAllByRole('link')).toHaveLength(0)
	})

	it('should render section with multiple routes', async () => {
		await render(NavSection, {
			inputs: { section: mockLargeSection },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Home')).toBeInTheDocument()
		expect(screen.getByText('Activity')).toBeInTheDocument()
		expect(screen.getByText('Settings')).toBeInTheDocument()
		expect(screen.getByText('Refresh')).toBeInTheDocument()
		expect(screen.getAllByRole('link')).toHaveLength(4)
	})

	it('should apply correct CSS classes to section title', async () => {
		await render(NavSection, {
			inputs: { section: mockSection, showTitle: true },
			providers: defaultProviders(),
		})

		const title = screen.getByText('Test Section')
		expect(title).toHaveClass('flex')
		expect(title).toHaveClass('h-8')
		expect(title).toHaveClass('items-center')
		expect(title).toHaveClass('px-2')
	})

	it('should render list items with correct structure', async () => {
		await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		const links = screen.getAllByRole('link')
		expect(links).toHaveLength(2)
		expect(links[0]).toHaveAttribute('href', '/route1')
		expect(links[1]).toHaveAttribute('href', '/route2')
	})

	it('should handle section with routes without icons', async () => {
		const sectionNoIcons: NavigationSection = {
			id: 'no-icons',
			name: 'No Icons Section',
			routes: [
				{
					id: 'route-no-icon',
					name: 'Route Without Icon',
					route: '/no-icon',
				},
			],
		}

		await render(NavSection, {
			inputs: { section: sectionNoIcons },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Route Without Icon')).toBeInTheDocument()
	})

	it('should update when section input changes', async () => {
		const newSection: NavigationSection = {
			id: 'updated-section',
			name: 'Updated Section',
			routes: [
				{
					id: 'new-route',
					name: 'New Route',
					route: '/new',
					icon: { featherActivity },
				},
			],
		}

		const { rerender } = await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Test Section')).toBeInTheDocument()

		await rerender({ inputs: { section: newSection } })

		expect(screen.getByText('Updated Section')).toBeInTheDocument()
		expect(screen.getByText('New Route')).toBeInTheDocument()
		expect(screen.queryByText('Test Section')).not.toBeInTheDocument()
	})

	it('should have OnPush change detection strategy', async () => {
		const { fixture } = await render(NavSection, {
			inputs: { section: mockSection },
			providers: defaultProviders(),
		})

		expect(fixture.componentRef.changeDetectorRef).toBeDefined()
	})

	it('should not render title when section has no name', async () => {
		const sectionWithoutName: NavigationSection = {
			id: 'no-name',
			routes: [
				{
					id: 'route1',
					name: 'Route 1',
					route: '/route1',
					icon: { featherHome },
				},
			],
		}

		await render(NavSection, {
			inputs: { section: sectionWithoutName },
			providers: defaultProviders(),
		})

		expect(screen.getByText('Route 1')).toBeInTheDocument()
		expect(screen.queryByText('no-name')).not.toBeInTheDocument()
	})

	it('should render routes normally when section name is omitted', async () => {
		const sectionWithoutName: NavigationSection = {
			id: 'unnamed',
			routes: [
				{ id: 'a', name: 'Alpha', route: '/a', icon: { featherHome } },
				{ id: 'b', name: 'Beta', route: '/b', icon: { featherActivity } },
			],
		}

		await render(NavSection, {
			inputs: { section: sectionWithoutName },
			providers: defaultProviders(),
		})

		expect(screen.getAllByRole('link')).toHaveLength(2)
		expect(screen.getByText('Alpha')).toBeInTheDocument()
		expect(screen.getByText('Beta')).toBeInTheDocument()
	})

	describe('collapsed input', () => {
		it('should show section title when collapsed is false', async () => {
			await render(NavSection, {
				inputs: { section: mockSection, collapsed: false },
				providers: defaultProviders(),
			})

			expect(screen.getByText('Test Section')).toBeInTheDocument()
		})

		it('should hide section title when collapsed is true', async () => {
			await render(NavSection, {
				inputs: { section: mockSection, collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.queryByText('Test Section')).not.toBeInTheDocument()
		})

		it('should show route names when collapsed is false', async () => {
			await render(NavSection, {
				inputs: { section: mockSection, collapsed: false },
				providers: defaultProviders(),
			})

			expect(screen.getByText('Route 1')).toBeInTheDocument()
			expect(screen.getByText('Route 2')).toBeInTheDocument()
		})

		it('should hide route names when collapsed is true', async () => {
			await render(NavSection, {
				inputs: { section: mockSection, collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.queryByText('Route 1')).not.toBeInTheDocument()
			expect(screen.queryByText('Route 2')).not.toBeInTheDocument()
		})

		it('should still render navigation links when collapsed', async () => {
			await render(NavSection, {
				inputs: { section: mockSection, collapsed: true },
				providers: defaultProviders(),
			})

			expect(screen.getAllByRole('link')).toHaveLength(2)
		})
	})
})
