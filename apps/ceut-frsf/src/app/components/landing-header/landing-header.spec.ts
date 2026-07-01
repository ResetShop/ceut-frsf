import { provideRouter } from '@angular/router'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { provideMockTheme } from '@resetshop/angular-core/theme/theme.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { LandingHeader } from './landing-header'

describe('LandingHeader', () => {
	beforeEach(() => clearAllMocks())

	const renderHeader = () =>
		render(LandingHeader, {
			providers: [provideRouter([]), provideTranslationMock(), provideMockTheme(false)],
		})

	it('renders a banner landmark', async () => {
		await renderHeader()

		expect(screen.getByRole('banner')).toBeInTheDocument()
	})

	it('renders the login link pointing to the auth page', async () => {
		await renderHeader()

		expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login')
	})

	it('renders the theme toggle', async () => {
		await renderHeader()

		expect(screen.getByRole('button', { name: /switch to (light|dark) mode/i })).toBeInTheDocument()
	})

	// The public landing route runs no session validation, so an authenticated shortcut here would be dead
	// code. The rationale is in the test name so it surfaces in CI output, not just this comment.
	it('never renders a dashboard link (stateless by design)', async () => {
		await renderHeader()

		expect(screen.queryByRole('link', { name: /go to dashboard/i })).not.toBeInTheDocument()
	})
})
