import { NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import {
	email as emailValidator,
	form,
	required,
	schema,
	FormField as SignalFormField,
	type FieldTree,
} from '@angular/forms/signals'
import { Router, RouterLink } from '@angular/router'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { FormField } from '@resetshop/ui/form-field/form-field'
import ImmersivePanel from '@resetshop/ui/immersive-panel/immersive-panel'
import { AuthStore } from '@store/auth/auth.store'
import type { LoginForm } from '../../../interfaces/auth'
import { createCountdown, formatCountdown } from '../countdown'

@Component({
	selector: 'app-login-page',
	host: { class: 'bg-card flex h-svh w-svw items-center justify-center sm:bg-black/95' },
	imports: [
		Alert,
		AlertDescription,
		ImmersivePanel,
		Button,
		NgOptimizedImage,
		RouterLink,
		FormField,
		SignalFormField,
		TranslatePipe,
	],
	template: `
		<form (submit)="onSubmit($event)" aria-labelledby="login-heading" class="w-full px-8 sm:w-[420px]">
			<app-immersive-panel [titleTemplate]="cardTitle" [contentTemplate]="cardContent" [footerTemplate]="cardFooter" />
			<ng-template #cardTitle>
				<!-- TODO: Replace the image for your system/company logo -->
				<span class="mt-4 flex flex-col gap-4">
					<img ngSrc="favicon.ico" width="47" height="40" alt="Your Company" class="mx-auto h-10 w-auto" />
					<span id="login-heading" class="text-foreground mb-8 block text-center">
						{{ 'AUTH.LOGIN.TITLE' | translate }}
					</span>
				</span>
			</ng-template>

			<ng-template #cardContent>
				<div class="flex w-full max-w-96 flex-col gap-4 sm:gap-6">
					<app-form-field [label]="'AUTH.LOGIN.EMAIL_LABEL' | translate" [showRequired]="false">
						<input [formField]="loginForm.email" type="email" autocomplete="email" />
					</app-form-field>

					<app-form-field
						[label]="'AUTH.LOGIN.PASSWORD_LABEL' | translate"
						[showRequired]="false"
						[labelEndTemplate]="forgotPassword"
					>
						<input [formField]="loginForm.password" type="password" autocomplete="current-password" />
					</app-form-field>
					<ng-template #forgotPassword>
						<a [routerLink]="resetPassword" class="text-interactive hover:text-interactive/80 text-sm hover:underline">
							{{ 'AUTH.LOGIN.FORGOT_PASSWORD' | translate }}
						</a>
					</ng-template>
				</div>

				@if (lockoutMessage()) {
					<div appAlert variant="destructive" class="mt-4">
						<p appAlertDescription>{{ lockoutMessage() }}</p>
					</div>
				} @else if (errorMessage()) {
					<div appAlert variant="destructive" class="mt-4">
						<p appAlertDescription>{{ errorMessage() }}</p>
					</div>
				}
			</ng-template>

			<ng-template #cardFooter>
				<div class="flex justify-center font-semibold">
					<button [fullWidth]="true" [disabled]="!isFormValid()" appButton size="md" type="submit">
						{{ 'AUTH.LOGIN.SUBMIT' | translate }}
					</button>
				</div>
			</ng-template>
		</form>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Login {
	private readonly authStore = inject(AuthStore)
	private readonly router = inject(Router)
	private readonly translation = inject(Translation)

	protected readonly resetPassword = this.router.createUrlTree(['/auth/reset-password'])
	protected readonly errorMessage = signal<string | null>(null)

	// Either of these blocks a login attempt: an account-level lockout (ACCOUNT_LOCKED 401) or the per-IP
	// rate limit (429 Retry-After). Lockout takes precedence if both are set — it's account-state-level.
	private readonly blockedUntil = computed(
		() => this.authStore.loginLockedUntil() ?? this.authStore.loginThrottledUntil(),
	)
	// Seconds remaining on whichever block is active (0 when neither); drives the countdown + disables submit.
	protected readonly remainingSeconds = createCountdown(this.blockedUntil)

	private readonly model = signal<LoginForm>({ email: '', password: '' })
	protected readonly loginForm: FieldTree<LoginForm> = form(
		this.model,
		schema<LoginForm>((login) => {
			required(login.email)
			emailValidator(login.email)
			required(login.password)
		}),
	)

	// Live "try again in mm:ss" message while a block is active; null once the countdown elapses.
	// The key differs for lockout ("too many failed attempts") vs throttle ("too many requests").
	protected readonly lockoutMessage = computed(() => {
		const seconds = this.remainingSeconds()
		if (seconds === 0) return null
		const key = this.authStore.loginLockedUntil()
			? 'AUTH.ERRORS.ACCOUNT_LOCKED_UNTIL'
			: 'AUTH.ERRORS.RATE_LIMITED_UNTIL'
		return this.translation.instant(key).replace('{time}', formatCountdown(seconds))
	})

	protected readonly isFormValid = computed(() => {
		if (this.remainingSeconds() > 0) return false
		const { email, password } = this.model()
		if (!email || !password) return false
		return this.loginForm.email().errors().length === 0 && this.loginForm.password().errors().length === 0
	})

	private readonly loginEffect = effect(() => {
		const user = this.authStore.currentUser()
		const error = this.authStore.loginError()

		if (user) {
			this.errorMessage.set(null)
			this.loginEffect.destroy() // safe: field is assigned before this callback runs
			this.router.navigate(['/dashboard'])
		} else if (error) {
			// While EITHER a lockout (ACCOUNT_LOCKED) or a per-IP throttle (429) is active, the live countdown
			// banner (lockoutMessage) supersedes the static message in the template. The 429 body has no
			// `code`, so it would otherwise fall through to GENERIC ("Error al iniciar sesión…"). untracked()
			// so this effect reacts to the arrival of a new error, not to every tick of the countdown.
			const isBlockedWithCountdown = untracked(() => this.remainingSeconds() > 0)
			this.errorMessage.set(
				isBlockedWithCountdown
					? null
					: this.translation.instant(error.code ? `AUTH.ERRORS.${error.code}` : 'AUTH.ERRORS.GENERIC'),
			)
		}
	})

	protected onSubmit(event: Event) {
		event.preventDefault()
		if (!this.isFormValid()) {
			// Signal forms FieldState.markAsTouched() only marks a single field;
			// there is no markAllAsTouched() equivalent — each field must be touched individually.
			this.loginForm.email().markAsTouched()
			this.loginForm.password().markAsTouched()
			return
		}

		this.errorMessage.set(null)

		const { email, password } = this.model()
		this.authStore.login({ email, password })
	}
}
