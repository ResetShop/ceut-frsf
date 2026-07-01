import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { LandingHeader } from './landing-header'

const meta: Meta<LandingHeader> = {
	component: LandingHeader,
	title: 'Components/LandingHeader',
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
The public landing-page header. It displays a brand wordmark linking back to the landing page, a theme toggle, and a **Login** link that navigates to \`/auth/login\`.

Unlike the dashboard \`Header\` (which is an \`[appHeader]\` attribute directive coupled to \`UIStore\` and the breadcrumb \`Navigation\`), this header is a self-contained, stateless component with no sidebar, no breadcrumbs, and no dashboard dependencies — it is safe to render on a fully public, server-side-rendered route.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<LandingHeader>

/**
 * The landing header — brand wordmark, theme toggle, and a Login link. It is stateless and renders
 * identically for every visitor (the public route runs no session validation).
 */
export const Default: Story = {}
