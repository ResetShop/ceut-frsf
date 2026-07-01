import { NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { email, form, required, schema, FormField as SignalFormField, type FieldTree } from '@angular/forms/signals'
import { Router, RouterLink } from '@angular/router'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '@resetshop/ui/button/button'
import { FormField } from '@resetshop/ui/form-field/form-field'
import ImmersivePanel from '@resetshop/ui/immersive-panel/immersive-panel'
import { AuthStore } from '@store/auth/auth.store'
import { createCountdown, formatCountdown } from '../countdown'

interface ResetPasswordForm {
	email: string
}

@Component({
	selector: 'app-reset-password-page',
	host: { class: 'bg-card flex h-svh w-svw items-center justify-center sm:bg-black/95' },
	imports: [ImmersivePanel, Button, NgOptimizedImage, RouterLink, FormField, SignalFormField, TranslatePipe],
	template: `
		<form (submit)="onSubmit($event)" aria-labelledby="reset-password-heading" class="w-full px-8 sm:w-[420px]">
			<app-immersive-panel [titleTemplate]="cardTitle" [contentTemplate]="cardContent" [footerTemplate]="cardFooter" />
			<ng-template #cardTitle>
				<span class="mt-4 flex flex-col gap-4">
					<img ngSrc="favicon.ico" width="47" height="40" alt="Your Company" class="mx-auto h-10 w-auto" />
					<span id="reset-password-heading" class="mb-8 block text-center">
						{{ 'AUTH.RESET_PASSWORD.TITLE' | translate }}
					</span>
				</span>
			</ng-template>

			<ng-template #cardContent>
				@if (throttleMessage()) {
					<p class="text-destructive w-full max-w-96 text-center text-sm font-medium">{{ throttleMessage() }}</p>
				} @else if (store.resetRequested()) {
					<p class="text-muted-foreground w-full max-w-96 text-center text-sm">
						{{ 'AUTH.RESET_PASSWORD.CONFIRMATION' | translate }}
					</p>
				} @else {
					<div class="flex w-full max-w-96 flex-col gap-6">
						<p class="text-muted-foreground text-center text-sm">
							{{ 'AUTH.RESET_PASSWORD.DESCRIPTION' | translate }}
						</p>
						<app-form-field [label]="'AUTH.RESET_PASSWORD.EMAIL_LABEL' | translate">
							<input [formField]="resetPasswordForm.email" type="email" autocomplete="email" />
						</app-form-field>
					</div>
				}
			</ng-template>

			<ng-template #cardFooter>
				<div class="flex flex-col gap-4 font-semibold">
					@if (!store.resetRequested() && throttleSeconds() === 0) {
						<button [fullWidth]="true" [disabled]="!isFormValid()" appButton variant="default" size="md" type="submit">
							{{ 'AUTH.RESET_PASSWORD.SUBMIT' | translate }}
						</button>
					}

					<div class="text-muted-foreground text-center text-sm">
						<a [routerLink]="loginUrl" appButton variant="link">
							{{ 'AUTH.RESET_PASSWORD.BACK_TO_LOGIN' | translate }}
						</a>
					</div>
				</div>
			</ng-template>
		</form>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResetPassword {
	private readonly router = inject(Router)
	protected readonly store = inject(AuthStore)
	private readonly translation = inject(Translation)

	protected readonly loginUrl = this.router.createUrlTree(['/auth/login'])

	// Seconds left on the per-IP forgot-password rate limit (0 when not throttled); drives the countdown.
	protected readonly throttleSeconds = createCountdown(this.store.resetThrottledUntil)
	protected readonly throttleMessage = computed(() => {
		const seconds = this.throttleSeconds()
		if (seconds === 0) return null
		return this.translation.instant('AUTH.ERRORS.RATE_LIMITED_UNTIL').replace('{time}', formatCountdown(seconds))
	})

	private readonly model = signal<ResetPasswordForm>({ email: '' })
	protected readonly resetPasswordForm: FieldTree<ResetPasswordForm> = form(
		this.model,
		schema<ResetPasswordForm>((resetPassword) => {
			required(resetPassword.email)
			email(resetPassword.email)
		}),
	)

	protected readonly isFormValid = computed(() => {
		const { email } = this.model()
		if (!email) return false
		return this.resetPasswordForm.email().errors().length === 0
	})

	constructor() {
		// Clear any stale reset state so returning to this page always shows a fresh form rather than a
		// confirmation lingering from a previous request (the flag lives in the root-scoped store).
		// Done synchronously here — before the first render — to avoid a flash of the stale confirmation.
		this.store.clearResetState()
	}

	protected onSubmit(event: Event) {
		event.preventDefault()
		if (!this.isFormValid()) {
			// Signal forms has no markAllAsTouched() — each field must be touched individually.
			this.resetPasswordForm.email().markAsTouched()
			return
		}

		this.store.forgotPassword(this.model().email)
	}
}
