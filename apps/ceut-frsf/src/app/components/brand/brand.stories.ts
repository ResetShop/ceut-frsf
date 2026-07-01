import { provideRouter } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import { featherRefreshCw } from '@ng-icons/feather-icons'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { Brand } from './brand'

const meta: Meta<Brand> = {
	component: Brand,
	title: 'Components/Brand',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([]), provideIcons({ featherRefreshCw })],
		}),
	],
	parameters: {
		docs: {
			canvas: { sourceState: 'shown' },
			description: {
				component: `
The Brand component renders the application's brand link in the sidebar header. It is a router link
that navigates to the dashboard, with an icon and an optional brand label.

The label is hidden when the \`collapsed\` input is true (passed down from the Sidebar).
				`,
			},
		},
	},
}

export default meta

type Story = StoryObj<Brand>

export const Expanded: Story = {
	args: { collapsed: false },
}

export const Collapsed: Story = {
	args: { collapsed: true },
}
