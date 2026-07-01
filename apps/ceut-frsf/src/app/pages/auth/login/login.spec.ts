import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { LoginErrorCode, type LoginErrorResponse } from '@contracts/auth/auth.errors'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { parseDurationToMs } from '@resetshop/util'
import { clearAllMocks, fn, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import Login from './login'

describe('Login', () => {
	beforeEach(() => clearAllMocks())

	const defaultProviders = () => [
		provideRouter([]),
		provideHttpClient(),
		provideHttpClientTesting(),
		provideAuthMock(),
		provideTranslationMock(),
		...provideSignalFormsConfig({}),
	]

	const renderLogin = () => render(Login, { providers: defaultProviders() })

	it('should create the login component', async () => {
		const { fixture } = await renderLogin()

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render the login form with email and password fields', async () => {
		await renderLogin()

		expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
	})

	it('should render submit button with appButton directive', async () => {
		await renderLogin()

		const submitButton = screen.getByRole('button', { name: /Sign in/i })

		expect(submitButton).toHaveClass('bg-default')
		expect(submitButton).toHaveClass('inline-flex')
		expect(submitButton).toHaveClass('w-full')
	})

	it('should show required error for email when focused and blurred empty', async () => {
		const user = userEvent.setup()
		await renderLogin()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.click(emailInput)
		await user.tab()

		expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
	})

	it('should show invalid email error when email format is incorrect', async () => {
		const user = userEvent.setup()
		await renderLogin()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.type(emailInput, 'invalid-email')
		await user.tab()

		expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
	})

	it('should show required error for password when focused and blurred empty', async () => {
		const user = userEvent.setup()
		await renderLogin()

		const passwordInput = screen.getByLabelText(/Password/i)
		await user.click(passwordInput)
		await user.tab()

		expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
	})

	it('should keep submit button disabled when password is empty', async () => {
		const user = userEvent.setup()
		await renderLogin()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.type(emailInput, 'test@example.com')

		const submitButton = screen.getByRole('button', { name: /Sign in/i })
		expect(submitButton).toBeDisabled()
	})

	it('should enable submit button when form is valid', async () => {
		const user = userEvent.setup()

		await renderLogin()

		const emailInput = screen.getByLabelText(/Email address/i)
		const passwordInput = screen.getByLabelText(/Password/i)

		await user.type(emailInput, 'test@example.com')
		await user.type(passwordInput, 'password123')

		const submitButton = screen.getByRole('button', { name: /Sign in/i })
		expect(submitButton).toBeEnabled()
	})

	it('should render forgot password link', async () => {
		await renderLogin()

		const forgotPasswordLink = screen.getByText(/forgot your password/i)
		expect(forgotPasswordLink).toBeInTheDocument()
	})

	it('should have correct form structure', async () => {
		await renderLogin()

		const emailInput = screen.getByLabelText(/Email address/i)
		const passwordInput = screen.getByLabelText(/Password/i)

		expect(emailInput).toBeInTheDocument()
		expect(passwordInput).toBeInTheDocument()
	})

	it('should not show email error when form is pristine', async () => {
		await renderLogin()

		expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
	})

	it('should not show password error when form is untouched', async () => {
		await renderLogin()

		expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/must be at least/i)).not.toBeInTheDocument()
	})

	describe('account lockout countdown', () => {
		beforeEach(() => useFakeTimers())
		afterEach(() => useRealTimers())

		const blockedStore = (lockedUntil: string | null, throttledUntil: string | null = null) => ({
			currentUser: signal(null),
			loginError: signal<LoginErrorResponse | null>(
				lockedUntil ? { code: LoginErrorCode.ACCOUNT_LOCKED, message: 'locked' } : null,
			),
			loginLockedUntil: signal<string | null>(lockedUntil),
			loginThrottledUntil: signal<string | null>(throttledUntil),
			login: fn(),
		})

		it('shows the lockout countdown and disables submit while locked', async () => {
			const future = new Date(Date.now() + parseDurationToMs('1m')).toISOString()
			await render(Login, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: blockedStore(future) }],
			})

			expect(await screen.findByText(/too many failed attempts/i)).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Sign in/i })).toBeDisabled()
		})

		it('does not show a lockout countdown when the account is not locked', async () => {
			await render(Login, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: blockedStore(null) }],
			})

			expect(screen.queryByText(/too many failed attempts/i)).not.toBeInTheDocument()
		})

		it('shows the rate-limit countdown and disables submit when the per-IP login limit (429) is tripped', async () => {
			const future = new Date(Date.now() + parseDurationToMs('1m')).toISOString()
			await render(Login, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: blockedStore(null, future) }],
			})

			expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Sign in/i })).toBeDisabled()
		})
	})
})
