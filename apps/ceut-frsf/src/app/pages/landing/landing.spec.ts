import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { fireEvent, render, screen } from '@testing-library/angular'
import LandingPage from './landing'

describe('LandingPage', () => {
	beforeEach(() => clearAllMocks())

	const renderPage = () =>
		render(LandingPage, {
			providers: [provideRouter([]), provideTranslationMock(), provideMockTheme(false)],
		})

	it('renders the hero heading and eyebrow', async () => {
		await renderPage()

		expect(screen.getByRole('heading', { level: 1, name: /your faculty, all in one place/i })).toBeInTheDocument()
		expect(screen.getByText('Student Center · UTN FRSF')).toBeInTheDocument()
	})

	it('renders a skip link targeting the main content', async () => {
		await renderPage()

		expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content')
	})

	it('renders the resource cards', async () => {
		await renderPage()

		expect(screen.getByRole('heading', { name: 'CEUT Library' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: 'Virtual Campus' })).toBeInTheDocument()
	})

	it('filters the cards by the search query', async () => {
		await renderPage()

		fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'library' } })

		expect(screen.getByRole('heading', { name: 'CEUT Library' })).toBeInTheDocument()
		expect(screen.queryByRole('heading', { name: 'Virtual Campus' })).not.toBeInTheDocument()
	})

	it('shows an empty state when nothing matches the query', async () => {
		await renderPage()

		fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'zzzzz' } })

		expect(screen.getByText(/no results found for/i)).toBeInTheDocument()
		expect(screen.queryByRole('heading', { name: 'CEUT Library' })).not.toBeInTheDocument()
	})
})
