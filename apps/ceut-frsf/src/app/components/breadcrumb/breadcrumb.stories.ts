import { provideRouter } from '@angular/router'
import { BreadcrumbItem } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { Breadcrumb } from './breadcrumb'

const createNavigationWithBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => ({
	provide: Navigation,
	useValue: {
		breadcrumbs: () => breadcrumbs,
		sections: () => [],
	},
})

const meta: Meta<Breadcrumb> = {
	component: Breadcrumb,
	title: 'Components/Breadcrumb',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([])],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
A breadcrumb navigation component that displays the hierarchical path to the current page. It automatically extracts breadcrumb items from the active route and its parent routes using Angular's native routing APIs.

## Features

- **Automatic Route Tracking**: Displays breadcrumbs based on the current route and its parent routes
- **Native Angular Router**: Uses the Route \`title\` property to configure breadcrumb labels
- **Navigable**: Click any breadcrumb item to navigate back to that route
- **Accessible**: Full ARIA support with proper semantic HTML
- **Responsive**: Per-segment truncation on mobile (below \`sm:\`); full width restored on wider viewports via \`sm:max-w-none\`. Chains of 3+ items collapse intermediate segments into an ellipsis (\`first › … › last\`) on mobile.
- **Dark Mode Support**: Automatic dark mode styling with Tailwind CSS
- **Icon Separators**: Uses chevron icons as visual separators
- **Current Page Indicator**: Highlights the active/current page

## Route Configuration

Routes must have a \`title\` property to appear in breadcrumbs:

\`\`\`typescript
const routes: Route[] = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    component: DashboardComponent,
    children: [
      {
        path: 'health',
        title: 'Health',
        component: HealthComponent,
      }
    ]
  }
];
\`\`\`

## Usage

\`\`\`typescript
import { Breadcrumb } from '@components/breadcrumb';

@Component({
  imports: [Breadcrumb],
  template: \`
    <nav class="border-b p-4">
      <app-breadcrumb />
    </nav>
  \`
})
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

type Story = StoryObj<Breadcrumb>

/**
 * Single breadcrumb item displaying the current page.
 * Useful for top-level or root pages.
 */
export const SingleItem: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([{ title: 'Dashboard', path: '/dashboard', isActive: true }]),
			],
		}),
	],
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Multiple breadcrumb items showing the hierarchical path.
 * Typical scenario with nested routes.
 */
export const MultipleItems: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Health', path: '/dashboard/health', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Deep nested breadcrumb path with multiple levels.
 * Shows how breadcrumbs display longer hierarchies.
 */
export const DeepNesting: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Settings', path: '/dashboard/settings', isActive: false },
					{ title: 'Profile', path: '/dashboard/settings/profile', isActive: false },
					{ title: 'Edit', path: '/dashboard/settings/profile/edit', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Breadcrumb with long titles rendered inside a `max-w-2xl` container — wider than the `sm:`
 * breakpoint, so the per-segment truncation caps are lifted by `sm:max-w-none` and both segments
 * render in full. Use the `MobileLongSegments` story below to see the truncation in effect.
 */
export const LongTitles: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'User Management Dashboard', path: '/user-management', isActive: false },
					{ title: 'User Profile Settings', path: '/user-management/profile-settings', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: '<div class="max-w-2xl"><app-breadcrumb /></div>',
	}),
}

/**
 * Breadcrumb with special characters and various text styles.
 */
export const SpecialCharacters: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Home & Dashboard', path: '/home', isActive: false },
					{ title: 'User (Admin)', path: '/home/user', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Breadcrumb in a light theme container.
 * Demonstrates the light mode styling.
 */
export const LightTheme: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Analytics', path: '/dashboard/analytics', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<div class="bg-white p-4 rounded-lg">
				<app-breadcrumb />
			</div>
		`,
	}),
}

/**
 * Breadcrumb in a dark theme container.
 * Demonstrates the dark mode styling with proper contrast.
 */
export const DarkTheme: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Reports', path: '/dashboard/reports', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<div class="dark bg-black p-4 rounded-lg">
				<app-breadcrumb />
			</div>
		`,
	}),
}

/**
 * Breadcrumb within a typical page header layout.
 * Shows the breadcrumb in context with other navigation elements.
 */
export const InPageHeader: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Users', path: '/dashboard/users', isActive: false },
					{ title: 'View', path: '/dashboard/users/view', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black/95 p-4">
				<div class="flex items-center justify-between mb-4">
					<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-50">Page Title</h1>
				</div>
				<app-breadcrumb />
			</header>
		`,
	}),
}

/**
 * Demonstrates the intermediate-item truncation at a constrained container width. Below `sm:`, the
 * chain collapses to `first › … › last` (the middle two items stay in the DOM but are CSS-hidden
 * via `hidden sm:inline-flex`). Resize to a wider viewport to see the full chain return.
 */
export const Responsive: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Admin Dashboard & Configuration', path: '/admin', isActive: false },
					{ title: 'System Settings', path: '/admin/settings', isActive: false },
					{ title: 'Advanced Options', path: '/admin/settings/advanced', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<div class="max-w-sm">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Small screen (max-width: 24rem)</p>
				<app-breadcrumb />
			</div>
		`,
	}),
}

/**
 * Mobile-viewport demonstration of the intermediate-item truncation. A four-segment trail collapses
 * to `first › … › last` below `sm:`; the two middle segments stay in the DOM marked `hidden
 * sm:inline-flex`. Resize Storybook to a wider viewport (or pick a non-mobile preset) to see the
 * full chain re-appear.
 */
export const MobileEllipsis: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Administration', path: '/dashboard/admin', isActive: false },
					{ title: 'User Management', path: '/dashboard/admin/users', isActive: false },
					{ title: 'Edit', path: '/dashboard/admin/users/edit', isActive: true },
				]),
			],
		}),
	],
	parameters: {
		viewport: { defaultViewport: 'mobile' },
		docs: { canvas: { sourceState: 'shown' } },
	},
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Mobile-viewport demonstration of per-segment width truncation. The first and last segments are
 * intentionally long: the first inactive link is capped at `max-w-[8rem]` and the active span at
 * `max-w-[14rem]`, both with `truncate` to produce an ellipsis. Hover (or use assistive tech) to
 * see the full label via the `title` attribute. Resize to a wider viewport to confirm the caps
 * are lifted by `sm:max-w-none`.
 */
export const MobileLongSegments: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Administration & Configuration', path: '/admin', isActive: false },
					{ title: 'Users', path: '/admin/users', isActive: false },
					{ title: 'Manage', path: '/admin/users/manage', isActive: false },
					{ title: 'Edit User: A Very Long Name Here', path: '/admin/users/manage/edit', isActive: true },
				]),
			],
		}),
	],
	parameters: {
		viewport: { defaultViewport: 'mobile' },
		docs: { canvas: { sourceState: 'shown' } },
	},
	render: () => ({
		template: '<app-breadcrumb />',
	}),
}

/**
 * Example showing all breadcrumb variations in one view.
 * Useful for design documentation and testing.
 */
export const AllStates: Story = {
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([]),
				createNavigationWithBreadcrumbs([
					{ title: 'Dashboard', path: '/dashboard', isActive: false },
					{ title: 'Reports', path: '/dashboard/reports', isActive: true },
				]),
			],
		}),
	],
	render: () => ({
		template: `
			<div class="space-y-8">
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Light Theme</h3>
					<div class="bg-white p-4 rounded border border-gray-200">
						<app-breadcrumb />
					</div>
				</div>
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">Dark Theme</h3>
					<div class="dark bg-black p-4 rounded border border-gray-800">
						<app-breadcrumb />
					</div>
				</div>
			</div>
		`,
	}),
}
