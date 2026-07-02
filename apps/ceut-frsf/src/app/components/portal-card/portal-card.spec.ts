import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { PortalCard } from './portal-card'
import type { PortalCard as PortalCardModel } from './portal-card.interface'

const plainCard: PortalCardModel = {
	id: 'biblioteca',
	titleKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TITLE',
	textKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TEXT',
	footerKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.FOOTER',
	icon: 'biblioteca.png',
	iconWidth: 500,
	iconHeight: 500,
	category: 'Académico',
}

// Café — the civil-purple accent resolves to white text.
const darkFillCard: PortalCardModel = {
	id: 'cafe',
	titleKey: 'LANDING.PORTAL.CARDS.CAFE.TITLE',
	textKey: 'LANDING.PORTAL.CARDS.CAFE.TEXT',
	icon: 'cafe.png',
	iconWidth: 159,
	iconHeight: 153,
	category: 'Vida estudiantil',
	accent: '#6e227d',
	glow: true,
}

// ¿Dónde curso? — the básicas-cyan accent resolves to dark text.
const lightFillCard: PortalCardModel = {
	id: 'donde-curso',
	titleKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TITLE',
	textKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TEXT',
	icon: 'donde-curso.png',
	iconWidth: 256,
	iconHeight: 256,
	category: 'Académico',
	accent: '#0099cc',
	glow: true,
}

describe('PortalCard', () => {
	beforeEach(() => clearAllMocks())

	const renderCard = (card: PortalCardModel) =>
		render(PortalCard, { inputs: { card }, providers: [provideTranslationMock()] })

	it('renders the translated title and body', async () => {
		await renderCard(plainCard)

		expect(screen.getByRole('heading', { name: 'CEUT Library' })).toBeInTheDocument()
		expect(screen.getByText('Search and reserve books from the faculty catalog.')).toBeInTheDocument()
	})

	it('renders the footer label when the card has one', async () => {
		await renderCard(plainCard)

		expect(screen.getByText('Catalog · loans')).toBeInTheDocument()
	})

	it('omits the footer for a card without a footer key', async () => {
		await renderCard(darkFillCard)

		expect(screen.getByText('Talks and gatherings among students.')).toBeInTheDocument()
		expect(screen.queryByText('Catalog · loans')).not.toBeInTheDocument()
	})

	it('uses white text on a dark accent fill', async () => {
		await renderCard(darkFillCard)

		expect(screen.getByRole('heading', { name: 'Café Tecnológico' })).toHaveClass('text-white')
	})

	it('uses dark text on a light accent fill', async () => {
		await renderCard(lightFillCard)

		expect(screen.getByRole('heading', { name: 'Where do I have class?' })).toHaveClass('text-gray-900')
	})
})
