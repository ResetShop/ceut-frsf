import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { Component, effect, input, signal } from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { LoginErrorCode } from '@contracts/auth/auth.errors'
import { parseDurationToMs } from '@resetshop/util'
import { AuthStore } from '@store/auth/auth.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import Login from './login'

/**
 * Error code options for the story.
 * null represents no error state.
 */
type ErrorCodeOption = LoginErrorCode | null

/**
 * Shared signal that drives the mock AuthStore's loginError state.
 * The story wrapper writes to it; the Login component's effect reads it via AuthStore.
 */
const storyLoginError = signal<{ code: string } | null>(null)

/** Drives the mock AuthStore's loginLockedUntil — set ~15 min ahead for the ACCOUNT_LOCKED story so the countdown renders. */
const storyLoginLockedUntil = signal<string | null>(null)

/** Drives the mock AuthStore's loginThrottledUntil — set ~15 min ahead for a per-IP rate-limit (429) story. */
const storyLoginThrottledUntil = signal<string | null>(null)

/**
 * Thin wrapper that renders the actual Login page component and
 * drives its error state via a mock AuthStore provider.
 */
@Component({
	selector: 'app-login-story',
	standalone: true,
	imports: [Login],
	template: `
		<app-login-page />
	`,
})
class LoginStoryComponent {
	public readonly errorCode = input<ErrorCodeOption>(null)
	public readonly throttled = input<boolean>(false)

	private readonly syncErrorEffect = effect(() => {
		const code = this.errorCode()
		storyLoginError.set(code ? { code } : null)
		storyLoginLockedUntil.set(
			code === LoginErrorCode.ACCOUNT_LOCKED ? new Date(Date.now() + parseDurationToMs('15m')).toISOString() : null,
		)
		storyLoginThrottledUntil.set(
			this.throttled() ? new Date(Date.now() + parseDurationToMs('15m')).toISOString() : null,
		)
	})
}

const meta: Meta<LoginStoryComponent> = {
	component: LoginStoryComponent,
	title: 'Pages/Auth/Login',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [
				...provideSignalFormsConfig({}),
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: AuthStore,
					useFactory: () => ({
						currentUser: signal(null),
						loginError: storyLoginError,
						loginLockedUntil: storyLoginLockedUntil,
						loginThrottledUntil: storyLoginThrottledUntil,
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						login: () => {},
					}),
				},
			],
		}),
	],
	parameters: {
		layout: 'fullscreen',
		viewport: { defaultViewport: 'mobile' },
		docs: {
			description: {
				component: `
Login page component with error message handling for various authentication states.

Below the \`sm:\` breakpoint the page renders as a full-screen takeover (via \`<app-immersive-panel>\`) with no card chrome and no surrounding backdrop. From \`sm:\` up the form sits as a 420 × 420 card centred on a dark backdrop.

## Features

- Email and password form fields with validation
- Error message display for authentication failures
- Account lockout message for security
- Responsive design with dark mode support

## Error States

The login page handles several error conditions (using \`LoginErrorCode\`):
- **INVALID_CREDENTIALS**: Displayed when email/password combination is incorrect
- **ACCOUNT_LOCKED**: Displayed when too many failed login attempts occur
- **GENERIC**: Displayed for unexpected server errors
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
	argTypes: {
		errorCode: {
			control: 'select',
			options: [null, LoginErrorCode.INVALID_CREDENTIALS, LoginErrorCode.ACCOUNT_LOCKED, LoginErrorCode.GENERIC],
			description: 'Error code to display',
			table: {
				type: { summary: 'LoginErrorCode | null' },
				defaultValue: { summary: 'null' },
			},
			labels: {
				null: 'No Error',
				[LoginErrorCode.INVALID_CREDENTIALS]: 'Invalid Credentials',
				[LoginErrorCode.ACCOUNT_LOCKED]: 'Account Locked',
				[LoginErrorCode.GENERIC]: 'Generic Error',
			},
		},
		throttled: {
			control: 'boolean',
			description: 'Show the per-IP rate-limit countdown (too many requests)',
			table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
		},
	},
}

export default meta

type Story = StoryObj<LoginStoryComponent>

/**
 * Default login page state with no error message.
 */
export const Default: Story = {
	args: {
		errorCode: null,
	},
}

/** Account locked after repeated failures — shows the live "try again in mm:ss" countdown and disables submit. */
export const AccountLocked: Story = {
	args: {
		errorCode: LoginErrorCode.ACCOUNT_LOCKED,
	},
}

/** Per-IP rate limit tripped (429) — the same countdown UX, with the "too many requests" message. */
export const RateLimited: Story = {
	args: {
		throttled: true,
	},
}
