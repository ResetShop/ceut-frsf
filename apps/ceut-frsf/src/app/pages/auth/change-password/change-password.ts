import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { form, minLength, required, schema, FormField as SignalFormField, type FieldTree } from '@angular/forms/signals'
import { Router } from '@angular/router'
import { MIN_PASSWORD_LENGTH } from '@contracts/auth/auth.constants'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { FormField } from '@resetshop/ui/form-field/form-field'
import ImmersivePanel from '@resetshop/ui/immersive-panel/immersive-panel'
import { AuthStore } from '@store/auth/auth.store'
import type { ChangePasswordForm } from '../../../interfaces/auth'

@Component({
	selector: 'app-change-password-page',
	host: { class: 'bg-card flex h-svh w-svw items-center justify-center sm:bg-black/95' },
	imports: [Alert, AlertDescription, ImmersivePanel, Button, FormField, SignalFormField, TranslatePipe],
	template: `
		<form (submit)="onSubmit($event)" aria-labelledby="change-password-heading" class="w-full px-8 sm:w-[420px]">
			<app-immersive-panel [titleTemplate]="cardTitle" [contentTemplate]="cardContent" [footerTemplate]="cardFooter" />
			<ng-template #cardTitle>
				<span id="change-password-heading" class="text-foreground mt-4 mb-8 block text-center">
					{{ 'AUTH.CHANGE_PASSWORD.TITLE' | translate }}
				</span>
			</ng-template>

			<ng-template #cardContent>
				<div class="flex w-full max-w-96 flex-col gap-4 sm:gap-6">
					<p class="text-muted-foreground text-center text-sm">
						{{ 'AUTH.CHANGE_PASSWORD.DESCRIPTION' | translate }}
					</p>

					<app-form-field [label]="'AUTH.CHANGE_PASSWORD.OLD_PASSWORD_LABEL' | translate" [showRequired]="false">
						<input [formField]="changePasswordForm.oldPassword" type="password" autocomplete="current-password" />
					</app-form-field>

					<app-form-field [label]="'AUTH.CHANGE_PASSWORD.NEW_PASSWORD_LABEL' | translate" [showRequired]="false">
						<input [formField]="changePasswordForm.newPassword" type="password" autocomplete="new-password" />
					</app-form-field>
				</div>

				@if (errorMessage()) {
					<div appAlert variant="destructive" class="mt-4">
						<p appAlertDescription>{{ errorMessage() }}</p>
					</div>
				}
			</ng-template>

			<ng-template #cardFooter>
				<div class="flex justify-center font-semibold">
					<button [fullWidth]="true" [disabled]="!isFormValid()" appButton size="md" type="submit">
						{{ 'AUTH.CHANGE_PASSWORD.SUBMIT' | translate }}
					</button>
				</div>
			</ng-template>
		</form>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChangePassword {
	private readonly authStore = inject(AuthStore)
	private readonly router = inject(Router)
	private readonly translation = inject(Translation)

	protected readonly errorMessage = signal<string | null>(null)

	// Set on submit so the success effect only navigates after a change this page initiated.
	private readonly submitted = signal(false)

	private readonly model = signal<ChangePasswordForm>({ oldPassword: '', newPassword: '' })
	protected readonly changePasswordForm: FieldTree<ChangePasswordForm> = form(
		this.model,
		schema<ChangePasswordForm>((changePassword) => {
			required(changePassword.oldPassword)
			required(changePassword.newPassword)
			minLength(changePassword.newPassword, MIN_PASSWORD_LENGTH)
		}),
	)

	protected readonly isFormValid = computed(() => {
		const { oldPassword, newPassword } = this.model()
		if (!oldPassword || !newPassword) return false
		return (
			this.changePasswordForm.oldPassword().errors().length === 0 &&
			this.changePasswordForm.newPassword().errors().length === 0
		)
	})

	private readonly changePasswordEffect = effect(() => {
		const changing = this.authStore.isChangingPassword()
		const error = this.authStore.changePasswordError()

		if (error) {
			// REASON: every PublicAuthErrorCode value has a matching AUTH.ERRORS.* translation key,
			// but TS won't narrow the interpolated template-literal union against the full TranslationKey.
			this.errorMessage.set(this.translation.instant(`AUTH.ERRORS.${error.code}` as TranslationKey))
			return
		}

		// Success path: navigate only once the request finished and this page initiated it.
		if (!changing && untracked(() => this.submitted())) {
			untracked(() => this.submitted.set(false))
			this.router.navigate(['/dashboard'])
		}
	})

	protected onSubmit(event: Event) {
		event.preventDefault()
		if (!this.isFormValid()) {
			// Signal forms has no markAllAsTouched() — each field must be touched individually.
			this.changePasswordForm.oldPassword().markAsTouched()
			this.changePasswordForm.newPassword().markAsTouched()
			return
		}

		this.errorMessage.set(null)
		this.submitted.set(true)

		const { oldPassword, newPassword } = this.model()
		this.authStore.changePassword({ oldPassword, newPassword })
	}
}
