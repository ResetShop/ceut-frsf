import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { LandingFooter } from './landing-footer'

describe('LandingFooter', () => {
	beforeEach(() => clearAllMocks())

	const renderFooter = () => render(LandingFooter, { providers: [provideTranslationMock()] })

	it('renders a contentinfo landmark', async () => {
		await renderFooter()

		expect(screen.getByRole('contentinfo')).toBeInTheDocument()
	})

	it('renders the brand name and tagline', async () => {
		await renderFooter()

		expect(screen.getByText('CEUT FRSF')).toBeInTheDocument()
		expect(screen.getByText('Student Center · UTN Facultad Regional Santa Fe')).toBeInTheDocument()
	})

	it('links to Instagram in a new tab', async () => {
		await renderFooter()

		const link = screen.getByRole('link', { name: 'Follow us on Instagram' })
		expect(link).toHaveAttribute('href', 'https://instagram.com/ceut.frsf')
		expect(link).toHaveAttribute('target', '_blank')
		expect(link).toHaveAttribute('rel', 'noopener')
	})

	it('links to Discord in a new tab', async () => {
		await renderFooter()

		const link = screen.getByRole('link', { name: 'Join our Discord' })
		expect(link).toHaveAttribute('href', 'https://discord.com/invite/BJ7wP7S')
		expect(link).toHaveAttribute('target', '_blank')
	})
})
