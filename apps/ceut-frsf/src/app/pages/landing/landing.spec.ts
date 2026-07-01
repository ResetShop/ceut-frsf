import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import LandingPage from './landing'

describe('LandingPage', () => {
	beforeEach(() => clearAllMocks())

	const renderPage = () =>
		render(LandingPage, {
			providers: [provideRouter([]), provideTranslationMock(), provideMockTheme(false)],
		})

	it('renders the hero heading', async () => {
		await renderPage()

		expect(screen.getByRole('heading', { level: 1, name: /ssr starter/i })).toBeInTheDocument()
	})

	it('renders the hero subheading', async () => {
		await renderPage()

		expect(screen.getByText(/production-ready starter/i)).toBeInTheDocument()
	})

	it('renders a primary call-to-action linking to the login page', async () => {
		await renderPage()

		expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/auth/login')
	})

	it('renders the features section heading', async () => {
		await renderPage()

		expect(screen.getByRole('heading', { level: 2, name: /what's included/i })).toBeInTheDocument()
	})

	it('renders the three feature highlights', async () => {
		await renderPage()

		expect(screen.getByRole('heading', { level: 3, name: /authentication/i })).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 3, name: /role-based access control/i })).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 3, name: /server-side rendering/i })).toBeInTheDocument()
	})

	it('renders a skip link targeting the main content', async () => {
		await renderPage()

		expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content')
	})
})
