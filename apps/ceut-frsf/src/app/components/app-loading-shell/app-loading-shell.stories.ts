import type { Meta, StoryObj } from '@storybook/angular'
import { AppLoadingShell } from './app-loading-shell'

type Story = StoryObj<AppLoadingShell>

const meta: Meta<AppLoadingShell> = {
	component: AppLoadingShell,
	title: 'Components/App Loading Shell',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
A reusable content-area wrapper that overlays a loading spinner on top of projected content.

## Features
- Wraps any content via \`<ng-content />\`
- Shows a semi-transparent overlay with a spinner when \`loading\` is \`true\`
- Content remains in the DOM while loading (no layout shift)
- Supports dark mode

## Usage
\`\`\`html
<app-loading-shell [loading]="isLoading()">
  <router-outlet />
</app-loading-shell>
\`\`\`
				`,
			},
			canvas: { sourceState: 'shown' },
		},
	},
	argTypes: {
		loading: {
			control: 'boolean',
			description: 'Whether the loading overlay is shown',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'required' },
			},
		},
	},
}

export default meta

/** Default idle state — content is visible, no overlay */
export const Default: Story = {
	args: { loading: false },
	render: (args) => ({
		props: args,
		template: `
			<app-loading-shell [loading]="loading">
				<div class="flex flex-col gap-4 p-6">
					<h2 class="text-lg font-semibold">Page Content</h2>
					<p class="text-muted-foreground">This content is wrapped by the loading shell.</p>
					<div class="bg-muted h-32 rounded-lg"></div>
				</div>
			</app-loading-shell>
		`,
	}),
}

/** Loading state — overlay with spinner is shown on top of content */
export const Loading: Story = {
	args: { loading: true },
	render: (args) => ({
		props: args,
		template: `
			<app-loading-shell [loading]="loading">
				<div class="flex flex-col gap-4 p-6">
					<h2 class="text-lg font-semibold">Page Content</h2>
					<p class="text-muted-foreground">This content is still in the DOM while loading.</p>
					<div class="bg-muted h-32 rounded-lg"></div>
				</div>
			</app-loading-shell>
		`,
	}),
}
