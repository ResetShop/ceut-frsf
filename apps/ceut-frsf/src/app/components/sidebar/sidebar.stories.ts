import { Component, inject, provideEnvironmentInitializer } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Brand } from '@components/brand/brand'
import NavItem from '@components/nav-item/nav-item'
import NavSection from '@components/nav-section/nav-section'
import { mockSidebarNavigationConfig } from '@mocks/navigation.mock'
import { provideIcons } from '@ng-icons/core'
import {
	featherActivity,
	featherChevronRight,
	featherChevronsLeft,
	featherChevronsRight,
	featherHome,
	featherRefreshCw,
	featherSettings,
	featherUser,
} from '@ng-icons/feather-icons'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { NAVIGATION_CONFIG } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import { Button } from '@resetshop/ui/button/button'
import { UIStore } from '@store/ui/ui.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { Sidebar } from './sidebar'

@Component({
	selector: 'app-dummy',
	standalone: true,
	template: '<div>Dummy Component</div>',
})
class DummyComponent {}

const meta: Meta<Sidebar> = {
	component: Sidebar,
	title: 'Navigation/Sidebar',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [
				provideRouter([
					{ path: 'dashboard', component: DummyComponent },
					{ path: 'activity', component: DummyComponent },
					{ path: 'users', component: DummyComponent },
					{ path: 'users/list', component: DummyComponent },
					{ path: 'users/create', component: DummyComponent },
					{ path: 'users/roles', component: DummyComponent },
					{ path: 'settings', component: DummyComponent },
					{ path: 'settings/profile', component: DummyComponent },
					{ path: 'settings/security', component: DummyComponent },
					{ path: 'settings/notifications', component: DummyComponent },
					{ path: '**', redirectTo: 'dashboard' },
				]),
				provideIcons({
					featherHome,
					featherActivity,
					featherRefreshCw,
					featherSettings,
					featherUser,
					featherChevronRight,
					featherChevronsLeft,
					featherChevronsRight,
				}),
				provideAuthMock(),
				{ provide: NAVIGATION_CONFIG, useValue: mockSidebarNavigationConfig },
				Navigation,
				NavigationState,
			],
		}),
		moduleMetadata({
			imports: [Sidebar, NavSection, NavItem, Brand, Button],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
A complete sidebar navigation component for application layouts.

## Features

- **Full-Height Layout**: Uses CSS Grid to structure header, navigation, and footer
- **Dynamic Navigation**: Pulls navigation data from the Navigation service
- **Icon Support**: Integrates with ng-icons for consistent iconography
- **RouterLink Integration**: Seamless navigation with Angular Router
- **Branding Area**: Top section for logo or app name
- **Sign Out Section**: Bottom section for authentication actions
- **Responsive**: Adapts to different screen sizes
- **OnPush Change Detection**: Optimized performance
- **Expandable Navigation**: Supports hierarchical routes with expand/collapse
- **Collapsible (Icon Mode)**: Reduces to icon-only rail via toggle button or Ctrl+B (lg breakpoint and above only)
- **Responsive Mobile**: Slides in as overlay sheet on mobile viewports (< 1024px)

## Layout Structure

The sidebar is divided into three main sections:
1. **Header (64px)**: Branding and home link
2. **Navigation (1fr)**: Scrollable navigation sections with expandable items
3. **Footer (64px)**: User actions like sign out

## Usage

\`\`\`typescript
import { Sidebar } from '@components/sidebar';

@Component({
  imports: [Sidebar],
  template: \`
    <div class="flex h-screen">
    	<aside class="w-64" appSidebar></aside>
    	<main class="flex-1">
    	<!-- Your content here -->
    	</main>
    </div>
  \`
})
\`\`\`

## Navigation Service

The sidebar uses the Navigation injectable service to manage navigation sections.
You can inject this service to dynamically update the navigation structure.

\`\`\`typescript
import { Navigation } from '@resetshop/angular-core/navigation/navigation';

@Component({...})
export class MyComponent {
  navigation = inject(Navigation);

  // Access sections
  sections = this.navigation.sections();
}
\`\`\`

## Interactive Features

- **Expandable Items**: Click parent items to expand/collapse child routes
- **Auto-Expand**: Parent items automatically expand when child route is active
- **Keyboard Support**: Full keyboard navigation (Enter/Space to toggle, Tab to navigate)
- **ARIA Support**: Screen reader friendly with proper ARIA attributes
- **Dark Mode**: Full dark mode support via CSS classes

**Note**: Toggle dark mode using Storybook's toolbar (top-right).

The sidebar below shows the full component in action with navigation sections from the Navigation service.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
		layout: 'fullscreen',
	},
}

export default meta

type Story = StoryObj<Sidebar>

/**
 * Complete sidebar with all navigation features.
 * The sidebar uses the Navigation service for dynamic navigation data.
 *
 * **Try these interactions:**
 * - Click parent navigation items to expand/collapse children
 * - Navigate to different routes
 * - Use keyboard (Enter/Space to toggle, Tab to navigate)
 * - Toggle dark mode via Storybook toolbar (top-right)
 */
export const Default: Story = {
	render: () => ({
		template: `
			<div class="flex h-screen bg-gray-50 dark:bg-gray-900">
				<div class="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
					<aside appSidebar></aside>
				</div>
				<main class="flex-1 p-8">
					<h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
						Application Layout
					</h1>
					<div class="space-y-4 text-gray-600 dark:text-gray-400">
						<p>This is your main content area. The sidebar navigation is on the left.</p>

						<div class="space-y-2">
							<p class="font-semibold">Try these interactions:</p>
							<ul class="list-disc list-inside space-y-1 text-sm">
								<li>Click parent navigation items to expand/collapse</li>
								<li>Use Enter or Space to toggle expansion</li>
								<li>Navigate between routes using Tab</li>
								<li>Parent items auto-expand when child is active</li>
								<li>Toggle dark mode via Storybook toolbar</li>
							</ul>
						</div>

						<div class="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
							<h3 class="font-semibold mb-2">Features Demonstrated</h3>
							<ul class="text-sm space-y-1">
								<li>✅ Full-height layout with header/nav/footer</li>
								<li>✅ Dynamic navigation from Navigation service</li>
								<li>✅ Expandable/collapsible hierarchical routes</li>
								<li>✅ Complete keyboard navigation</li>
								<li>✅ ARIA attributes for accessibility</li>
								<li>✅ Dark mode support</li>
							</ul>
						</div>
					</div>
				</main>
			</div>
		`,
	}),
}

/**
 * Realistic application layout showing sidebar in context.
 * Demonstrates how the sidebar integrates into a complete application.
 * Includes multiple sections with expandable navigation and realistic content.
 */
export const Playground: Story = {
	render: () => ({
		template: `
			<div class="flex h-screen bg-gray-50 dark:bg-gray-900">
				<!-- Sidebar -->
				<div class="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
					<aside appSidebar></aside>
				</div>

				<!-- Main Content -->
				<main class="flex-1 overflow-auto">
					<div class="p-8">
						<!-- Page Header -->
						<div class="mb-8">
							<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
							<p class="text-gray-600 dark:text-gray-400">Welcome to your application dashboard</p>
						</div>

						<!-- Content Grid -->
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<!-- Card 1 -->
							<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
								<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Navigation Features</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									The sidebar demonstrates expandable navigation with parent/child routes.
								</p>
								<ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
									<li>• Click to expand/collapse</li>
									<li>• Auto-expand on active route</li>
									<li>• Keyboard navigation support</li>
								</ul>
							</div>

							<!-- Card 2 -->
							<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
								<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Responsive Design</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									The layout adapts to different screen sizes and supports dark mode.
								</p>
								<ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
									<li>• Fixed width sidebar (256px)</li>
									<li>• Flexible main content area</li>
									<li>• Dark mode ready</li>
								</ul>
							</div>

							<!-- Card 3 -->
							<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
								<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Accessibility</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Full ARIA support and keyboard navigation for screen readers.
								</p>
								<ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
									<li>• ARIA labels and roles</li>
									<li>• Keyboard shortcuts</li>
									<li>• Screen reader friendly</li>
								</ul>
							</div>
						</div>

						<!-- Additional Content Section -->
						<div class="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
							<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Integration Example</h2>
							<p class="text-gray-600 dark:text-gray-400 mb-4">
								This is a complete example showing how the sidebar integrates into a real application layout.
								The Navigation service provides dynamic navigation data, making it easy to update menu items
								throughout your application.
							</p>
							<div class="bg-gray-50 dark:bg-gray-900 rounded p-4 border border-gray-200 dark:border-gray-700">
								<code class="text-sm text-gray-800 dark:text-gray-200">
									<pre class="whitespace-pre-wrap">
&lt;div class="flex h-screen"&gt;
  &lt;aside class="w-64" appSidebar&gt;&lt;/aside&gt;
  &lt;main class="flex-1"&gt;
    &lt;!-- Your content --&gt;
  &lt;/main&gt;
&lt;/div&gt;</pre>
								</code>
							</div>
						</div>
					</div>
				</main>
			</div>
		`,
	}),
}

/**
 * Sidebar in collapsed (icon-only) mode.
 * Use the collapse toggle button at the bottom or press Ctrl+B to toggle.
 * Only available at lg breakpoint (1024px) and above.
 */
export const Collapsed: Story = {
	render: () => ({
		template: `
			<div class="flex h-screen bg-gray-50 dark:bg-gray-900">
				<div class="border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" style="width: 48px;">
					<aside appSidebar></aside>
				</div>
				<main class="flex-1 p-8">
					<h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
						Collapsed Sidebar
					</h1>
					<p class="text-gray-600 dark:text-gray-400">
						The sidebar is in icon-only mode. Click the expand button or press Ctrl+B to expand.
					</p>
				</main>
			</div>
		`,
	}),
}

/**
 * Sidebar at mobile viewport width.
 * On viewports below 1024px the sidebar renders as a fixed overlay sheet
 * with a capped width of min(280px, 80vw). The collapse toggle is hidden.
 *
 * This story only accurately represents the visual at < 1024px viewport widths,
 * since collapse toggle visibility is driven by real matchMedia in the component.
 */
export const Mobile: Story = {
	parameters: {
		layout: 'fullscreen',
		viewport: { defaultViewport: 'mobile1' },
	},
	decorators: [
		applicationConfig({
			providers: [provideEnvironmentInitializer(() => inject(UIStore).setSidebarOpen(true))],
		}),
	],
	render: () => ({
		template: `
			<div class="relative h-screen bg-gray-50 dark:bg-gray-900">
				<aside appSidebar></aside>
				<main class="p-4">
					<h1 class="text-lg font-bold text-gray-900 dark:text-gray-100">
						Mobile Viewport
					</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						The sidebar slides in as an overlay. Collapse toggle is hidden below lg.
					</p>
				</main>
			</div>
		`,
	}),
}
