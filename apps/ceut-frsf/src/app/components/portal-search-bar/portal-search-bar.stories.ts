import { provideTranslationMock } from '@providers/i18n/translation.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { PortalSearchBar } from './portal-search-bar'

const meta: Meta<PortalSearchBar> = {
	component: PortalSearchBar,
	title: 'Components/PortalSearchBar',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideTranslationMock()],
		}),
	],
	parameters: {
		docs: {
			canvas: { sourceState: 'shown' },
			description: {
				component: `
The portal search bar — a joined search-icon prefix and input used on the home to filter the resource
grid live. It is presentation-only: the \`value\` model is two-way bound and the parent owns filtering.
				`,
			},
		},
	},
}

export default meta

type Story = StoryObj<PortalSearchBar>

/** Empty search bar showing the placeholder. */
export const Empty: Story = {
	args: { value: '' },
}

/** Search bar with a query typed in. */
export const WithValue: Story = {
	args: { value: 'becas' },
}
