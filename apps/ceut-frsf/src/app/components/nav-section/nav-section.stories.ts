import { Component } from '@angular/core'
import { provideRouter } from '@angular/router'
import {
	mockDocumentsRoute,
	mockHelpRoute,
	mockMainMenuSection,
	mockMainSection,
	mockMixedSection,
	mockSettingsRouteSimple,
	mockUsersRoute,
} from '@mocks/navigation.mock'
import { provideIcons } from '@ng-icons/core'
import {
	featherActivity,
	featherCalendar,
	featherChevronRight,
	featherFileText,
	featherHelpCircle,
	featherHome,
	featherMail,
	featherSettings,
	featherUser,
} from '@ng-icons/feather-icons'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import NavSection from './nav-section'

@Component({
	selector: 'app-dummy',
	standalone: true,
	template: '<div>Dummy Component</div>',
})
class DummyComponent {}

const meta: Meta<typeof NavSection> = {
	component: NavSection,
	title: 'Navigation/NavSection',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([{ path: '**', component: DummyComponent }]),
				provideIcons({
					featherHome,
					featherActivity,
					featherSettings,
					featherUser,
					featherHelpCircle,
					featherMail,
					featherCalendar,
					featherFileText,
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
A navigation section component that displays a group of related navigation items with an optional title.

## Features

- **Optional Title**: Show or hide the section title
- **Multiple Routes**: Display multiple navigation items
- **Grouped Navigation**: Organize related routes together
- **Consistent Styling**: Uniform appearance across all navigation items
- **Track by ID**: Efficient rendering with Angular's track function

## Usage

\`\`\`typescript
import NavSection from '@components/nav-section';

@Component({
  imports: [NavSection],
  template: \`
    <app-nav-section
      [section]="navigationSection"
      [showTitle]="true"
    />
  \`
})
\`\`\`

**Note**: Toggle dark mode using Storybook's toolbar (top-right).
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<typeof NavSection>

/**
 * Default navigation section with title and multiple routes.
 *
 * **Variations:**
 * - Without title: Set `[showTitle]="false"`
 * - Without icons: Omit `icon` property from routes
 * - Dark mode: Toggle via Storybook toolbar (top-right)
 */
export const Default: Story = {
	render: () => ({
		props: { mockMainSection },
		template: `
			<div class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
				<app-nav-section
					[showTitle]="true"
					[section]="mockMainSection"
				/>
			</div>
		`,
	}),
}

/**
 * Navigation section with expandable parent items.
 * Demonstrates hierarchical navigation with child routes.
 * Click parent items to expand/collapse their children.
 */
export const WithExpandableItems: Story = {
	render: () => ({
		props: { mockMixedSection },
		template: `
			<div class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
				<app-nav-section [section]="mockMixedSection" />
			</div>
		`,
	}),
}

/**
 * Multiple navigation sections stacked vertically.
 * Demonstrates the typical sidebar pattern with grouped navigation.
 * Includes sections with many routes and mixed expandable/leaf items.
 */
export const MultipleSections: Story = {
	render: () => ({
		props: {
			mockMainMenuSection,
			mockUsersRoute,
			mockDocumentsRoute,
			mockSettingsRouteSimple,
			mockHelpRoute,
			managementSection: {
				id: 'management',
				name: 'Management',
				routes: [mockUsersRoute, mockDocumentsRoute],
			},
			settingsSection: {
				id: 'settings',
				name: 'Settings & Support',
				routes: [mockSettingsRouteSimple, mockHelpRoute],
			},
		},
		template: `
			<div class="w-64 rounded-lg border border-gray-200 p-2 flex flex-col gap-4 dark:border-gray-700 dark:bg-gray-800">
				<!-- Main Menu -->
				<app-nav-section [section]="mockMainMenuSection" />

				<!-- Management Section -->
				<app-nav-section [section]="managementSection" />

				<!-- Settings & Help -->
				<app-nav-section [section]="settingsSection" />

				<!-- Section without title -->
				<app-nav-section
					[showTitle]="false"
					[section]="{
						id: 'quick-actions',
						name: 'Quick Actions',
						routes: [
							{ id: 'action1', name: 'Dashboard', route: '/dashboard' },
							{ id: 'action2', name: 'Reports', route: '/reports' },
							{ id: 'action3', name: 'Analytics', route: '/analytics' }
						]
					}"
				/>
			</div>
		`,
	}),
}

/**
 * Edge cases and special scenarios.
 * - **Empty section**: Section with no routes (graceful handling)
 * - **Hidden title**: Section without visible title
 * - **Single item**: Section with only one route
 */
export const EdgeCases: Story = {
	render: () => ({
		template: `
			<div class="space-y-6">
				<!-- Empty section -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Empty Section</h3>
					<div class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<app-nav-section
							[section]="{
								id: 'empty',
								name: 'Empty Section',
								routes: []
							}"
						/>
					</div>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Section renders without errors when routes array is empty</p>
				</div>

				<!-- Section with single item -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Single Item Section</h3>
					<div class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<app-nav-section
							[section]="{
								id: 'single',
								name: 'Single Item',
								routes: [
									{ id: 'home', name: 'Home', route: '/home', icon: { featherHome } }
								]
							}"
						/>
					</div>
				</div>

				<!-- Hidden title -->
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hidden Title</h3>
					<div class="w-64 rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
						<app-nav-section
							[showTitle]="false"
							[section]="{
								id: 'notitle',
								name: 'This title is hidden',
								routes: [
									{ id: 'home', name: 'Home', route: '/home', icon: { featherHome } },
									{ id: 'settings', name: 'Settings', route: '/settings', icon: { featherSettings } }
								]
							}"
						/>
					</div>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Useful for sections that don't need visual separation</p>
				</div>
			</div>
		`,
	}),
}
