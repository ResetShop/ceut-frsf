import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import {
	email as emailValidator,
	form,
	maxLength,
	required,
	schema,
	FormField as SignalFormField,
} from '@angular/forms/signals'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { Spinner } from '@resetshop/ui/spinner/spinner'
import { createMutationToast } from '@store/ui/mutation-toast'
import { UsersStore } from '@store/users/users.store'

interface ProfileFormModel {
	email: string
	firstName: string
	lastName: string
}

@Component({
	selector: 'app-user-profile-section',
	standalone: true,
	imports: [
		FormField,
		SignalFormField,
		Button,
		Spinner,
		Alert,
		AlertDescription,
		HasPermissionDirective,
		TranslatePipe,
	],
	template: `
		<section class="border-border bg-card rounded-xl border p-4 sm:p-5" aria-labelledby="profile-section-title">
			<h2 id="profile-section-title" class="text-foreground text-lg font-semibold">
				{{ 'USERS.DETAIL.PROFILE.TITLE' | translate }}
			</h2>

			<form (submit)="onSubmit($event)" class="mt-4 flex flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				<app-form-field [label]="'USERS.DETAIL.PROFILE.FIRST_NAME' | translate">
					<input [formField]="profileForm.firstName" type="text" autocomplete="given-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.DETAIL.PROFILE.LAST_NAME' | translate">
					<input [formField]="profileForm.lastName" type="text" autocomplete="family-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.DETAIL.PROFILE.EMAIL' | translate">
					<input [formField]="profileForm.email" type="email" autocomplete="email" />
				</app-form-field>

				<div *hasPermission="'admin:users:update'" class="flex justify-end">
					<button [disabled]="showSpinner() || !isFormValid() || !profileForm().dirty()" type="submit" appButton>
						@if (showSpinner()) {
							<app-spinner data-icon="start" />
						}
						{{ showSpinner() ? ('COMMON.SAVING' | translate) : ('USERS.DETAIL.PROFILE.SAVE' | translate) }}
					</button>
				</div>
			</form>
		</section>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileSection {
	public readonly user = input.required<IManagedUser>()

	private readonly usersStore = inject(UsersStore)
	private readonly translation = inject(Translation)

	private readonly toast = createMutationToast(this.translation.instant('USERS.DETAIL.PROFILE.SUCCESS_TOAST'))

	private readonly model = signal<ProfileFormModel>({ email: '', firstName: '', lastName: '' })
	protected readonly profileForm = form(
		this.model,
		schema<ProfileFormModel>((profile) => {
			required(profile.email)
			emailValidator(profile.email)
			required(profile.firstName)
			maxLength(profile.firstName, 100)
			required(profile.lastName)
			maxLength(profile.lastName, 100)
		}),
	)

	protected readonly isFormValid = computed(() => this.profileForm().errors().length === 0)
	protected readonly showSpinner = computed(() => this.usersStore.isUpdating())
	protected readonly mutationError = computed(() => this.usersStore.mutationError().update)

	// Populates the form from the resolved user; resets dirty state on (re)load.
	private readonly populateFormEffect = effect(() => {
		const user = this.user()
		this.model.set({ email: user.email, firstName: user.firstName, lastName: user.lastName })
		untracked(() => this.profileForm().reset())
	})

	private readonly successToastEffect = effect(() => {
		const updating = this.usersStore.isUpdating()
		const error = this.usersStore.mutationError().update
		untracked(() => this.toast.handleResult(updating, error))
	})

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid()) return

		const { email, firstName, lastName } = this.model()
		this.toast.markSubmitted()
		this.usersStore.updateUser({ id: this.user().id, body: { email, firstName, lastName } })
	}
}
