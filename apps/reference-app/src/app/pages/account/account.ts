import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core'
import {
	form,
	maxLength,
	required,
	requiredError,
	schema,
	FormField as SignalFormField,
	validate,
} from '@angular/forms/signals'
import { PageShell } from '@components/page-shell/page-shell'
import { QUERY_DEFAULTS } from '@contracts/common/query.constants'
import { computeProfileDiff, type ProfileDiff, type ProfileFormModel } from '@domain/user/user-profile-diff'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmChangesDialog } from '@resetshop/ui/confirm-changes-dialog/confirm-changes-dialog'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { AuthStore } from '@store/auth/auth.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { toAccountChangesEntries } from './account-profile-changes.presenter'

/**
 * Self-service profile page: the signed-in user editing their own profile. The email is shown as static
 * text because changing it requires verification. Submitting never persists directly: it opens a
 * before → after confirmation of every changed field, and only a confirmed edit is saved.
 */
@Component({
	selector: 'app-account',
	imports: [PageShell, TranslatePipe, FormField, SignalFormField, Button, ConfirmChangesDialog],
	template: `
		<app-page-shell [title]="'ACCOUNT.TITLE' | translate" [loading]="false">
			<p pageDescription>{{ 'ACCOUNT.DESCRIPTION' | translate }}</p>

			@if (authStore.currentUser(); as user) {
				<section
					class="border-border bg-card max-w-2xl rounded-xl border p-4 sm:p-5"
					aria-labelledby="account-profile-title"
				>
					<h2 id="account-profile-title" class="text-foreground text-lg font-semibold">
						{{ 'ACCOUNT.PROFILE.TITLE' | translate }}
					</h2>

					<form (submit)="onSubmit($event)" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<app-form-field [label]="'ACCOUNT.PROFILE.FIRST_NAME' | translate">
							<input [formField]="profileForm.firstName" type="text" autocomplete="given-name" />
						</app-form-field>

						<app-form-field [label]="'ACCOUNT.PROFILE.LAST_NAME' | translate">
							<input [formField]="profileForm.lastName" type="text" autocomplete="family-name" />
						</app-form-field>

						<dl class="sm:col-span-2">
							<dt class="text-muted-foreground text-sm">{{ 'ACCOUNT.PROFILE.EMAIL' | translate }}</dt>
							<dd class="text-foreground mt-1 font-medium break-all">{{ user.email }}</dd>
						</dl>

						<div class="flex justify-end sm:col-span-2">
							<button
								[disabled]="authStore.isUpdatingProfile() || !isFormValid() || !hasChanges()"
								type="submit"
								appButton
							>
								{{ 'ACCOUNT.REVIEW' | translate }}
							</button>
						</div>
					</form>
				</section>
			}
		</app-page-shell>

		<app-confirm-changes-dialog
			(confirmed)="onChangesConfirmed()"
			[title]="'ACCOUNT.CONFIRM_DIALOG.TITLE' | translate"
			[message]="'ACCOUNT.CONFIRM_DIALOG.MESSAGE' | translate"
			[changes]="confirmEntries()"
			[beforeLabel]="'ACCOUNT.CONFIRM_DIALOG.BEFORE' | translate"
			[afterLabel]="'ACCOUNT.CONFIRM_DIALOG.AFTER' | translate"
			[confirmText]="'ACCOUNT.CONFIRM_DIALOG.CONFIRM' | translate"
			[cancelText]="'COMMON.CANCEL' | translate"
		/>
	`,
})
export default class Account {
	protected readonly authStore = inject(AuthStore)
	private readonly translation = inject(Translation)
	private readonly confirmDialog = viewChild.required(ConfirmChangesDialog)

	private readonly model = signal<ProfileFormModel>({ firstName: '', lastName: '' })
	protected readonly profileForm = form(
		this.model,
		schema<ProfileFormModel>((profile) => {
			for (const name of [profile.firstName, profile.lastName]) {
				required(name)
				validate(name, ({ value }) => (value().trim() ? undefined : requiredError()))
				maxLength(name, QUERY_DEFAULTS.NAME_MAX_LENGTH)
			}
		}),
	)

	private readonly diff = computed<ProfileDiff>(() => {
		const user = this.authStore.currentUser()
		return user ? computeProfileDiff(user, this.model()) : { patch: {}, changes: {} }
	})

	protected readonly isFormValid = computed(() => this.profileForm().valid())
	protected readonly hasChanges = computed(() => Object.keys(this.diff().changes).length > 0)
	protected readonly confirmEntries = computed(() =>
		toAccountChangesEntries(this.diff().changes, (key) => this.translation.instant(key)),
	)

	private readonly toast = createMutationToast(this.translation.instant('ACCOUNT.SUCCESS_TOAST'))

	private readonly syncFromUserEffect = effect(() => {
		const user = this.authStore.currentUser()
		untracked(() => {
			if (user) {
				this.model.set({ firstName: user.firstName, lastName: user.lastName })
				this.profileForm().reset()
			}
		})
	})

	private readonly saveResultEffect = effect(() => {
		const saving = this.authStore.isUpdatingProfile()
		const error = this.authStore.updateProfileError()
		untracked(() => this.toast.handleResult(saving, error))
	})

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid() || !this.hasChanges()) return
		this.confirmDialog().show()
	}

	protected onChangesConfirmed(): void {
		this.toast.markSubmitted()
		this.authStore.updateProfile(this.diff().patch)
	}
}
