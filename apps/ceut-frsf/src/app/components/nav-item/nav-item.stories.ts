import { provideRouter } from '@angular/router'
import {
	mockActivityRoute,
	mockHelpRoute,
	mockHomeRoute,
	mockSettingsRouteSimple,
	mockUsersRoute,
} from '@mocks/navigation.mock'
import { provideIcons } from '@ng-icons/core'
import {
	featherActivity,
	featherChevronRight,
	featherHelpCircle,
	featherHome,
	featherSettings,
	featherUser,
} from '@ng-icons/feather-icons'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import NavItem from './nav-item'

const meta: Meta<typeof NavItem> = {
	component: NavItem,
	title: 'Navigation/NavItem',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([{ path: '**', component: NavItem }]),
				provideIcons({
					featherHome,
					featherActivity,
					featherSettings,
					featherUser,
					featherHelpCircle,
					featherChevronRight,
				}),
				NavigationState,
			],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
Navigation item with RouterLink integration, optional icons, and expandable children.

Supports keyboard navigation (Enter/Space), ARIA attributes, auto-expand on active routes, and dark mode.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<typeof NavItem>

/**
 * Default navigation item with icon.
 * Most common use case for navigation menus.
 *
 * **Variations:**
 * - Without icon: Simply omit the `icon` property
 * - Different icons: Use any icon from `@ng-icons/feather-icons`
 * - Dark mode: Toggle via Storybook toolbar (top-right)
 */
export const Default: Story = {
	render: () => ({
		props: { mockHomeRoute },
		template: `
			<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
				<li [item]="mockHomeRoute" appNavItem></li>
			</ul>
		`,
	}),
}

/**
 * Parent navigation item with expandable children.
 * Click the parent to expand/collapse child routes.
 * Demonstrates auto-expand when child route is active.
 */
export const WithChildren: Story = {
	render: () => ({
		props: { mockUsersRoute },
		template: `
			<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
				<li [item]="mockUsersRoute" appNavItem></li>
			</ul>
		`,
	}),
}

/**
 * Realistic navigation menu showing multiple items.
 * Demonstrates a typical sidebar navigation pattern with mix of parent and leaf items.
 *
 * **Features shown:**
 * - Mix of items with and without icons
 * - Expandable parent items
 * - Leaf items (no children)
 * - Proper spacing between items
 */
export const Playground: Story = {
	render: () => ({
		props: { mockHomeRoute, mockSettingsRouteSimple, mockActivityRoute, mockHelpRoute },
		template: `
			<ul class="w-64 rounded-lg border border-gray-200 p-2 space-y-1 dark:border-gray-700 dark:bg-gray-800">
				<li [item]="mockHomeRoute" appNavItem></li>
				<li [item]="mockSettingsRouteSimple" appNavItem></li>
				<li [item]="mockActivityRoute" appNavItem></li>
				<li [item]="mockHelpRoute" appNavItem></li>
			</ul>
		`,
	}),
}

/**
 * Edge cases and special scenarios.
 * - **Long text**: Truncation with tooltip on hover
 * - **Deep nesting**: 3 levels (not recommended - max 2-3 levels)
 * - **Without icon**: Text-only navigation items
 */
export const EdgeCases: Story = {
	render: () => ({
		template: `
			<div class="space-y-8">
				<!-- Long text truncation -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Long Text Truncation</h3>
					<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<li [item]="{
							id: 'long',
							name: 'This is a very long navigation item name that should be truncated with ellipsis',
							route: '/long-route',
							icon: { featherSettings }
						}" appNavItem></li>
					</ul>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Hover to see full text in tooltip</p>
				</div>

				<!-- Without icon -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Without Icon</h3>
					<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<li [item]="{
							id: 'no-icon',
							name: 'Text Only',
							route: '/text-only'
						}" appNavItem></li>
					</ul>
				</div>

				<!-- Deep nesting (3 levels) -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Deep Nesting</h3>
					<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<li [item]="{
							id: 'dashboard',
							name: 'Dashboard',
							route: '/dashboard',
							icon: { featherHome },
							children: [
								{
									id: 'analytics',
									name: 'Analytics',
									route: '/dashboard/analytics',
									children: [
										{ id: 'reports', name: 'Reports', route: '/dashboard/analytics/reports' },
										{ id: 'charts', name: 'Charts', route: '/dashboard/analytics/charts' }
									]
								},
								{ id: 'overview', name: 'Overview', route: '/dashboard/overview' }
							]
						}" appNavItem></li>
					</ul>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">⚠️ Recommend max 2-3 levels of nesting</p>
				</div>
			</div>
		`,
	}),
}

/**
 * Accessibility features demonstration.
 * Shows ARIA attributes and keyboard navigation support.
 *
 * **Try these interactions:**
 * - **Tab**: Navigate between items
 * - **Enter/Space**: Toggle expandable items
 * - **Screen Reader**: Announces expanded/collapsed state
 */
export const Accessibility: Story = {
	render: () => ({
		props: { mockUsersRoute },
		template: `
			<div class="space-y-6">
				<!-- Instructions -->
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
					<h3 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Keyboard Navigation</h3>
					<ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
						<li>• <kbd class="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-700">Tab</kbd> - Navigate between items</li>
						<li>• <kbd class="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-700">Enter</kbd> or <kbd class="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-700">Space</kbd> - Toggle expandable items</li>
						<li>• Screen readers announce "expanded" or "collapsed" state</li>
					</ul>
				</div>

				<!-- Navigation with accessibility features -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ARIA Attributes</h3>
					<ul class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<li [item]="mockUsersRoute" appNavItem></li>
					</ul>
					<div class="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
						<p><strong>ARIA attributes:</strong></p>
						<ul class="list-disc list-inside pl-2 space-y-0.5">
							<li><code>aria-expanded</code> - Indicates expanded/collapsed state</li>
							<li><code>aria-controls</code> - Links button to controlled element</li>
							<li><code>aria-hidden</code> - Hides collapsed children from screen readers</li>
						</ul>
					</div>
				</div>
			</div>
		`,
	}),
}
