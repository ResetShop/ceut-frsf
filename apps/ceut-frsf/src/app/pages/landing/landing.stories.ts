import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import LandingPage from './landing'

const meta: Meta<LandingPage> = {
	component: LandingPage,
	title: 'Pages/Landing',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([]), provideTranslationMock(), provideMockTheme(false)],
		}),
	],
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
The public, server-side-rendered landing page mounted at \`/\`. It is fully accessible to both anonymous and authenticated visitors — no route guard is involved.

The page composes the \`LandingHeader\` (Login link + theme toggle) with a hero section and a three-up grid of feature highlights. The hero call-to-action and the header Login link both navigate to \`/auth/login\`.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<LandingPage>

/**
 * The landing page as seen by every visitor.
 */
export const Default: Story = {}
