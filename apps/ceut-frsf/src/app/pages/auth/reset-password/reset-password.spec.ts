import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { AuthApi } from '@providers/auth/auth.interface'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { parseDurationToMs } from '@resetshop/util'
import { clearAllMocks, fn, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { NEVER } from 'rxjs'
import ResetPassword from './reset-password'

describe('ResetPassword', () => {
	beforeEach(() => clearAllMocks())

	const defaultProviders = () => [
		provideRouter([]),
		provideHttpClient(),
		provideHttpClientTesting(),
		provideAuthMock(),
		provideTranslationMock(),
		...provideSignalFormsConfig({}),
	]

	const renderResetPassword = () => render(ResetPassword, { providers: defaultProviders() })

	it('should create the reset password component', async () => {
		const { fixture } = await renderResetPassword()

		expect(fixture.componentInstance).toBeTruthy()
	})

	it('should render the reset password form with email field', async () => {
		await renderResetPassword()

		expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
	})

	it('should render submit button with appButton directive', async () => {
		await renderResetPassword()

		const submitButton = screen.getByRole('button', { name: /Send reset link/i })

		expect(submitButton).toHaveClass('bg-default')
		expect(submitButton).toHaveClass('inline-flex')
		expect(submitButton).toHaveClass('w-full')
	})

	it('should keep submit button disabled when form is empty', async () => {
		await renderResetPassword()

		expect(screen.getByRole('button', { name: /Send reset link/i })).toBeDisabled()
	})

	it('should show required error for email when focused and blurred empty', async () => {
		const user = userEvent.setup()
		await renderResetPassword()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.click(emailInput)
		await user.tab()

		expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
	})

	it('should show invalid email error when email format is incorrect', async () => {
		const user = userEvent.setup()
		await renderResetPassword()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.type(emailInput, 'invalid-email')
		await user.tab()

		expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
	})

	it('should enable submit button when form is valid', async () => {
		const user = userEvent.setup()

		await renderResetPassword()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.type(emailInput, 'test@example.com')

		const submitButton = screen.getByRole('button', { name: /Send reset link/i })
		expect(submitButton).toBeEnabled()
	})

	it('should render back to login link', async () => {
		await renderResetPassword()

		const backToLoginLink = screen.getByText(/Back to sign in/i)
		expect(backToLoginLink).toBeInTheDocument()
	})

	it('should render "Back to sign in" as a navigable link', async () => {
		await renderResetPassword()

		const backButton = screen.getByRole('link', { name: /Back to sign in/i })
		expect(backButton).toBeInTheDocument()
	})

	it('should display the reset password title', async () => {
		await renderResetPassword()

		expect(screen.getByText(/Reset password/i)).toBeInTheDocument()
	})

	it('should have correct form structure', async () => {
		await renderResetPassword()

		const emailInput = screen.getByLabelText(/Email address/i)
		expect(emailInput).toBeInTheDocument()
	})

	it('should not show error messages when form is untouched', async () => {
		await renderResetPassword()

		expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
	})

	it('shows the neutral confirmation after submitting a valid email', async () => {
		const user = userEvent.setup()
		await renderResetPassword()

		await user.type(screen.getByLabelText(/Email address/i), 'test@example.com')
		await user.click(screen.getByRole('button', { name: /Send reset link/i }))

		expect(await screen.findByText(/a password-reset link has been sent/i)).toBeInTheDocument()
		// The email field is replaced by the confirmation (no enumeration of whether the account exists).
		expect(screen.queryByLabelText(/Email address/i)).not.toBeInTheDocument()
	})

	it('shows the confirmation immediately, before the request resolves (optimistic, no timing leak)', async () => {
		const user = userEvent.setup()
		// forgotPassword never completes — proves the confirmation does not wait on the round-trip, so
		// its timing cannot reveal whether the account exists.
		const hangingApi = { forgotPassword: () => NEVER } as unknown as AuthApi
		await render(ResetPassword, {
			providers: [...defaultProviders(), { provide: AuthApi, useValue: hangingApi }],
		})

		await user.type(screen.getByLabelText(/Email address/i), 'test@example.com')
		await user.click(screen.getByRole('button', { name: /Send reset link/i }))

		expect(await screen.findByText(/a password-reset link has been sent/i)).toBeInTheDocument()
		expect(screen.queryByLabelText(/Email address/i)).not.toBeInTheDocument()
	})

	it('should clear error when valid email is entered after blur', async () => {
		const user = userEvent.setup()
		await renderResetPassword()

		const emailInput = screen.getByLabelText(/Email address/i)
		await user.click(emailInput)
		await user.tab()
		expect(screen.getByText(/this field is required/i)).toBeInTheDocument()

		await user.click(emailInput)
		await user.type(emailInput, 'valid@example.com')

		expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
	})

	describe('stale state isolation', () => {
		// These tests replace AuthStore with a plain mock, so the provideAuthMock() inside defaultProviders
		// is inert here (the mock never touches AuthApi); it is kept only so the provider set matches the
		// rest of the file.
		it('shows the form, not a stale confirmation, when resetRequested is already true on arrival', async () => {
			// Simulates returning to the page after a prior request left resetRequested=true in the root store.
			const resetRequested = signal(true)
			const mockStore = {
				resetRequested,
				resetThrottledUntil: signal<string | null>(null),
				forgotPassword: fn(),
				clearResetState: () => resetRequested.set(false),
			}

			await render(ResetPassword, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: mockStore }],
			})

			expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument()
			expect(screen.queryByText(/a password-reset link has been sent/i)).not.toBeInTheDocument()
		})

		it('clears the reset state once on init', async () => {
			const mockStore = {
				resetRequested: signal(false),
				resetThrottledUntil: signal<string | null>(null),
				forgotPassword: fn(),
				clearResetState: fn(),
			}

			await render(ResetPassword, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: mockStore }],
			})

			expect(mockStore.clearResetState.calls).toHaveLength(1)
		})
	})

	describe('rate-limit countdown', () => {
		beforeEach(() => useFakeTimers())
		afterEach(() => useRealTimers())

		it('shows the countdown and hides the submit button when throttled', async () => {
			const mockStore = {
				resetRequested: signal(false),
				resetThrottledUntil: signal<string | null>(new Date(Date.now() + parseDurationToMs('1m')).toISOString()),
				forgotPassword: fn(),
				clearResetState: fn(),
			}

			await render(ResetPassword, {
				providers: [...defaultProviders(), { provide: AuthStore, useValue: mockStore }],
			})

			expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
			expect(screen.queryByRole('button', { name: /Send reset link/i })).not.toBeInTheDocument()
		})
	})
})
