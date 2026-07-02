import { provideTranslationMock } from '@providers/i18n/translation.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { LandingFooter } from './landing-footer'

const meta: Meta<LandingFooter> = {
	component: LandingFooter,
	title: 'Components/LandingFooter',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideTranslationMock()],
		}),
	],
	parameters: {
		layout: 'fullscreen',
		docs: {
			canvas: { sourceState: 'shown' },
			description: {
				component: `
The CEUT portal footer — a deep brand-blue band with the raised-hands mark, the centre name and
tagline, and outbound Instagram/Discord links (opened in a new tab).
				`,
			},
		},
	},
}

export default meta

type Story = StoryObj<LandingFooter>

export const Default: Story = {}
