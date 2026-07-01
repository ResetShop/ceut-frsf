import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { applicationConfig, Meta, StoryObj } from '@storybook/angular'
import { ThemeToggle } from './theme-toggle'

const meta: Meta<ThemeToggle> = {
	component: ThemeToggle,
	title: 'Components/ThemeToggle',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideMockTheme(false)],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
A theme toggle button that switches between light and dark modes. Uses Feather icons (Sun/Moon) to indicate the current theme and allow users to switch preferences.

## Features

- **Icon Toggle**: Displays Sun icon in light mode, Moon icon in dark mode
- **Persistent**: Saves theme preference to localStorage
- **System Preference**: Respects system dark mode preference on first load
- **Accessible**: Proper ARIA labels for screen readers
- **Ghost Variant**: Subtle button styling that fits well in headers
- **Responsive**: Works on all screen sizes

## Usage

\`\`\`typescript
import { ThemeToggle } from '@components/theme-toggle';

@Component({
  imports: [ThemeToggle],
  template: \`<app-theme-toggle />\`
})
export class MyComponent {}
\`\`\`

## Theme Management

The component uses the \`Theme\` service which:
- Manages theme state via Angular signals
- Persists preference to localStorage
- Applies the \`dark\` class to \`<html>\` element
- Respects system color scheme preference
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<ThemeToggle>

/**
 * Theme toggle in header context
 */
export const InHeader: Story = {
	render: () => ({
		template: `
			<header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black/95 p-4">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-50">Theme toggler:</h1>
					</div>
					<app-theme-toggle />
				</div>
			</header>
		`,
	}),
}
