import { provideRouter } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import { featherChevronRight, featherMenu } from '@ng-icons/feather-icons'
import { BreadcrumbItem } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { Header } from './header'

const createNavigationWithBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => ({
	provide: Navigation,
	useValue: {
		breadcrumbs: () => breadcrumbs,
		sections: () => [],
	},
})

const meta: Meta<Header> = {
	component: Header,
	title: 'Components/Header',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([]), provideIcons({ featherChevronRight, featherMenu }), provideMockTheme(false)],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
The Header component serves as the navigation header for the dashboard layout. It displays breadcrumb navigation showing the hierarchical path to the current page.

## Features

- **Breadcrumb Navigation**: Displays the path to the current page
- **Route-based**: Automatically updates based on the active route
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Full semantic HTML and ARIA support
- **Dark Mode Support**: Automatic dark mode styling

## Usage

The Header component is used via a directive in your layout:

\`\`\`typescript
import { Header } from '@components/header';

@Component({
  imports: [Header],
  template: \`
    <nav appHeader></nav>
  \`
})
export class MyLayout {}
\`\`\`

## What's Included

The Header displays:
- **Hamburger Menu**: Toggle button for mobile sidebar (visible below 1024px, wired to UIStore.toggleSidebar)
- **Breadcrumbs**: Navigation path based on the current route (from Navigation service)
- **Theme Toggle**: Button to switch between light and dark modes (included in the header)

## Theme Toggle

The ThemeToggle component is automatically included in the Header. It:
- Shows a Sun icon in light mode, Moon icon in dark mode
- Toggles the theme when clicked
- Persists preference to localStorage
- Respects system dark mode preference on first load

To use ThemeToggle separately:

\`\`\`typescript
import { ThemeToggle } from '@components/theme-toggle';
 
@Component({
  imports: [ThemeToggle],
  template: \`<app-theme-toggle />\`
})
export class MyComponent {}
\`\`\`
			`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<Header>

/**
 * Default header with a simple breadcrumb trail.
 */
export const Default: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Health', path: '/dashboard/health', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<header class="border-border bg-background border-b p-4">
				<div appHeader></div>
			</header>`,
	}),
}

/**
 * Header displaying a single-level breadcrumb (root page).
 */
export const SingleLevelBreadcrumb: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([{ title: 'Dashboard', path: '/dashboard', isActive: true }]),
			],
		}),
	],
	render: () => ({
		template: `
			<header class="border-border bg-background border-b p-4">
				<div appHeader></div>
			</header>`,
	}),
}

/**
 * Header with multi-level nested breadcrumbs.
 */
export const MultiLevelBreadcrumb: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Settings', path: '/dashboard/settings', isActive: false },
					{ title: 'Profile', path: '/dashboard/settings/profile', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<header class="border-border bg-background border-b p-4">
				<div appHeader></div>
			</header>`,
	}),
}

/**
 * Header in the full dashboard layout context.
 */
export const InDashboardLayout: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Analytics', path: '/dashboard/analytics', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
				<div class="grid h-screen gap-0" style="grid-template-columns: 240px 1fr; grid-template-rows: 64px 1fr;">
					<aside class="col-span-1 row-span-2 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black/90">
						<div class="p-4">
							<p class="text-xs text-gray-500 dark:text-gray-400">Sidebar</p>
						</div>
					</aside>
					<nav class="border-border bg-background border-b p-2">
						<header appHeader></header>
					</nav>
					<main class="bg-white p-4 dark:bg-black/95">
						<p class="text-sm text-gray-600 dark:text-gray-400">Main content area</p>
					</main>
				</div>
			`,
	}),
}

/**
 * Header with very deep breadcrumb nesting.
 */
export const DeeplyNestedBreadcrumb: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Admin', path: '/dashboard/admin', isActive: false },
					{ title: 'Settings', path: '/dashboard/admin/settings', isActive: false },
					{ title: 'System', path: '/dashboard/admin/settings/system', isActive: false },
					{ title: 'Security', path: '/dashboard/admin/settings/system/security', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
				<header class="border-border bg-background border-b p-4">
					<div appHeader></div>
				</header>
			`,
	}),
}

/**
 * Mobile-viewport rendering of the header with a four-segment breadcrumb. The breadcrumb collapses
 * to `first › … › last` below `sm:`, and the host padding tightens to `px-2`. Pick a non-mobile
 * viewport (or resize) to see the full chain and `px-4` padding return.
 */
export const MobileViewport: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Admin', path: '/dashboard/admin', isActive: false },
					{ title: 'Settings', path: '/dashboard/admin/settings', isActive: false },
					{ title: 'Profile', path: '/dashboard/admin/settings/profile', isActive: true },
				]),
			],
		}),
	],
	parameters: {
		viewport: { defaultViewport: 'mobile' },
		docs: { canvas: { sourceState: 'shown' } },
	},
	render: () => ({
		template: `
			<header class="border-border bg-background border-b">
				<div appHeader></div>
			</header>`,
	}),
}

/**
 * Header showing responsive layout with full dashboard context.
 */
export const ResponsiveDashboardLayout: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				provideIcons({ featherChevronRight, featherMenu }),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Analytics', path: '/dashboard/analytics', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
				<div class="space-y-4">
					<div>
						<p class="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Desktop (1920px)</p>
						<div style="max-width: 100%;" class="border border-gray-200 dark:border-gray-800">
							<header class="border-border bg-background border-b p-4">
								<div appHeader></div>
							</header>
						</div>
					</div>
					<div>
						<p class="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Tablet (768px)</p>
						<div style="max-width: 768px;" class="border border-gray-200 dark:border-gray-800">
							<header class="border-border bg-background border-b p-3">
								<div appHeader></div>
							</header>
						</div>
					</div>
					<div>
						<p class="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Mobile (375px)</p>
						<div style="max-width: 375px;" class="border border-gray-200 dark:border-gray-800">
							<header class="border-border bg-background border-b p-2">
								<div appHeader></div>
							</header>
						</div>
					</div>
				</div>
			`,
	}),
}
