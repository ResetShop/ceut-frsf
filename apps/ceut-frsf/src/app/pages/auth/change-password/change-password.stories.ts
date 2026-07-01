import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { Component, effect, input, signal } from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { PublicAuthErrorCode } from '@contracts/auth/auth.errors'
import { AuthStore } from '@store/auth/auth.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import ChangePassword from './change-password'

/**
 * Error code options for the story. null represents no error state.
 */
type ErrorCodeOption = PublicAuthErrorCode | null

/**
 * Shared signal that drives the mock AuthStore's changePasswordError state.
 * The story wrapper writes to it; the ChangePassword component's effect reads it via AuthStore.
 */
const storyChangePasswordError = signal<{ code: string } | null>(null)

/**
 * Thin wrapper that renders the actual ChangePassword page and drives its error
 * state via a mock AuthStore provider.
 */
@Component({
	selector: 'app-change-password-story',
	standalone: true,
	imports: [ChangePassword],
	template: `
		<app-change-password-page />
	`,
})
class ChangePasswordStoryComponent {
	public readonly errorCode = input<ErrorCodeOption>(null)

	private readonly syncErrorEffect = effect(() => {
		const code = this.errorCode()
		storyChangePasswordError.set(code ? { code } : null)
	})
}

const meta: Meta<ChangePasswordStoryComponent> = {
	component: ChangePasswordStoryComponent,
	title: 'Pages/Auth/Change Password',
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
						isChangingPassword: signal(false),
						changePasswordError: storyChangePasswordError,
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						changePassword: () => {},
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
Forced/voluntary password-change page. Below the \`sm:\` breakpoint it renders as a full-screen takeover (via \`<app-immersive-panel>\`); from \`sm:\` up it sits as a card centred on a dark backdrop.

## Features

- Current-password and new-password fields with validation (new password ≥ 12 characters)
- Error message display for change-password failures

## Error States

- **OLD_PASSWORD_MISMATCH**: The supplied current password is incorrect
- **GENERIC**: Unexpected server error
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
			options: [null, PublicAuthErrorCode.OLD_PASSWORD_MISMATCH, PublicAuthErrorCode.GENERIC],
			description: 'Error code to display',
			table: {
				type: { summary: 'PublicAuthErrorCode | null' },
				defaultValue: { summary: 'null' },
			},
			labels: {
				null: 'No Error',
				[PublicAuthErrorCode.OLD_PASSWORD_MISMATCH]: 'Old Password Mismatch',
				[PublicAuthErrorCode.GENERIC]: 'Generic Error',
			},
		},
	},
}

export default meta

type Story = StoryObj<ChangePasswordStoryComponent>

/**
 * Default state with no error message.
 */
export const Default: Story = {
	args: {
		errorCode: null,
	},
}
