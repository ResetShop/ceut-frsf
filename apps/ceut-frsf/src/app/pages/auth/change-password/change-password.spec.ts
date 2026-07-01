import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { InMemoryAuthApi, provideAuthMock } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import ChangePassword from './change-password'

describe('ChangePassword', () => {
	beforeEach(() => clearAllMocks())

	const defaultProviders = () => [
		provideRouter([]),
		provideHttpClient(),
		provideHttpClientTesting(),
		provideAuthMock(),
		provideTranslationMock(),
		...provideSignalFormsConfig({}),
	]

	const renderPage = () => render(ChangePassword, { providers: defaultProviders() })

	it('should create the change-password component', async () => {
		const { fixture } = await renderPage()

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render the current and new password fields', async () => {
		await renderPage()

		expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/New password/i)).toBeInTheDocument()
	})

	it('should render the submit button', async () => {
		await renderPage()

		expect(screen.getByRole('button', { name: /Change password/i })).toBeInTheDocument()
	})

	it('should keep submit disabled until both fields are filled and valid', async () => {
		const user = userEvent.setup()
		await renderPage()

		const submit = screen.getByRole('button', { name: /Change password/i })
		expect(submit).toBeDisabled()

		await user.type(screen.getByLabelText(/Current password/i), 'old-password-123')
		await user.type(screen.getByLabelText(/New password/i), 'a-fresh-secure-password')

		expect(submit).toBeEnabled()
	})

	it('should show a min-length error when the new password is too short', async () => {
		const user = userEvent.setup()
		await renderPage()

		await user.type(screen.getByLabelText(/New password/i), 'short')
		await user.tab()

		expect(screen.getByText(/must be at least/i)).toBeInTheDocument()
	})

	it('should keep submit disabled when the new password is too short', async () => {
		const user = userEvent.setup()
		await renderPage()

		await user.type(screen.getByLabelText(/Current password/i), 'old-password-123')
		await user.type(screen.getByLabelText(/New password/i), 'short')

		expect(screen.getByRole('button', { name: /Change password/i })).toBeDisabled()
	})

	it('should show a required error for current password when focused and blurred empty', async () => {
		const user = userEvent.setup()
		await renderPage()

		await user.click(screen.getByLabelText(/Current password/i))
		await user.tab()

		expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
	})

	it('should not show validation errors when the form is pristine', async () => {
		await renderPage()

		expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/must be at least/i)).not.toBeInTheDocument()
	})

	it('shows the error banner when the change-password request fails', async () => {
		const api = new InMemoryAuthApi()
		api.setError(
			'changePassword',
			new HttpErrorResponse({ status: 400, error: { code: 'OLD_PASSWORD_MISMATCH', message: 'wrong' } }),
		)
		const user = userEvent.setup()
		await render(ChangePassword, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideAuthMock(api),
				provideTranslationMock(),
				...provideSignalFormsConfig({}),
			],
		})

		await user.type(screen.getByLabelText(/Current password/i), 'old-password-123')
		await user.type(screen.getByLabelText(/New password/i), 'a-fresh-secure-password')
		await user.click(screen.getByRole('button', { name: /Change password/i }))

		expect(await screen.findByText(/Your current password is incorrect/i)).toBeInTheDocument()
	})
})
