import { Component, effect, input, signal } from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideRouter } from '@angular/router'
import { parseDurationToMs } from '@resetshop/util'
import { AuthStore } from '@store/auth/auth.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import ResetPassword from './reset-password'

/** Shared signal driving the mock AuthStore's `resetRequested` state (form vs. confirmation). */
const storyResetRequested = signal(false)

/** Shared signal driving the mock AuthStore's `resetThrottledUntil` (rate-limit countdown). */
const storyResetThrottledUntil = signal<string | null>(null)

@Component({
	selector: 'app-reset-password-story',
	standalone: true,
	imports: [ResetPassword],
	template: `
		<app-reset-password-page />
	`,
})
class ResetPasswordStoryComponent {
	public readonly requested = input<boolean>(false)
	public readonly throttled = input<boolean>(false)

	private readonly syncEffect = effect(() => {
		storyResetRequested.set(this.requested())
		storyResetThrottledUntil.set(
			this.throttled() ? new Date(Date.now() + parseDurationToMs('15m')).toISOString() : null,
		)
	})
}

const meta: Meta<ResetPasswordStoryComponent> = {
	component: ResetPasswordStoryComponent,
	title: 'Pages/Auth/Reset Password',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [
				...provideSignalFormsConfig({}),
				provideRouter([]),
				{
					provide: AuthStore,
					useFactory: () => ({
						resetRequested: storyResetRequested,
						resetThrottledUntil: storyResetThrottledUntil,
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						forgotPassword: () => {},
						// eslint-disable-next-line @typescript-eslint/no-empty-function
						clearResetState: () => {},
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
Password-reset **request** page. Email-only form that calls \`forgotPassword\`; on completion it shows a
neutral "if an account exists, a link was sent" confirmation (no user enumeration), regardless of whether
the email is registered.

Below the \`sm:\` breakpoint the page renders as a full-screen takeover (via \`<app-immersive-panel>\`); from
\`sm:\` up the form sits as a card centred on a dark backdrop.
`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
	argTypes: {
		requested: {
			control: 'boolean',
			description: 'Show the post-submit confirmation state instead of the form',
			table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
		},
		throttled: {
			control: 'boolean',
			description: 'Show the rate-limit countdown (too many requests)',
			table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
		},
	},
}

export default meta

type Story = StoryObj<ResetPasswordStoryComponent>

/** The request form (default state). */
export const Default: Story = {
	args: { requested: false },
}

/** The neutral confirmation shown after a request is submitted. */
export const Confirmation: Story = {
	args: { requested: true },
}

/** Rate-limited: the live "try again in mm:ss" countdown shown after too many requests. */
export const Throttled: Story = {
	args: { throttled: true },
}
