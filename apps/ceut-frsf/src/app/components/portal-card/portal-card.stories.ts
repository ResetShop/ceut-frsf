import { provideTranslationMock } from '@providers/i18n/translation.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { PortalCard } from './portal-card'
import type { PortalCard as PortalCardModel } from './portal-card.interface'

const meta: Meta<PortalCard> = {
	component: PortalCard,
	title: 'Components/PortalCard',
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
The CEUT portal "tarjeta" — the signature resource card on the home grid. A plain white card by
default; supplying an \`accent\` fills the whole card with a brand colour and switches the text to the
higher-contrast tone (white or near-black), computed per accent via WCAG contrast. Pair \`accent\` with
\`glow\` for the tinted drop shadow lifted from the original site.
				`,
			},
		},
	},
}

export default meta

type Story = StoryObj<PortalCard>

/** Plain white card with an icon, title, body and a hairline footer with a tag. */
export const Plain: Story = {
	args: {
		card: {
			id: 'biblioteca',
			titleKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TITLE',
			textKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TEXT',
			footerKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.FOOTER',
			icon: 'biblioteca.png',
			iconWidth: 500,
			iconHeight: 500,
			category: 'Académico',
		} satisfies PortalCardModel,
	},
}

/** Colored card whose accent resolves to white text (civil purple). */
export const AccentLightText: Story = {
	args: {
		card: {
			id: 'cafe',
			titleKey: 'LANDING.PORTAL.CARDS.CAFE.TITLE',
			textKey: 'LANDING.PORTAL.CARDS.CAFE.TEXT',
			icon: 'cafe.png',
			iconWidth: 159,
			iconHeight: 153,
			category: 'Vida estudiantil',
			accent: '#6e227d',
			glow: true,
		} satisfies PortalCardModel,
	},
}

/** Colored card whose accent resolves to dark text (básicas cyan) — the case the design's "always white" note gets wrong. */
export const AccentDarkText: Story = {
	args: {
		card: {
			id: 'donde-curso',
			titleKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TITLE',
			textKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TEXT',
			icon: 'donde-curso.png',
			iconWidth: 256,
			iconHeight: 256,
			category: 'Académico',
			accent: '#0099cc',
			glow: true,
		} satisfies PortalCardModel,
	},
}
