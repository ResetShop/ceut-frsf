import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core'
import { UserStatus } from '@contracts/user/user.constants'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmDialog } from '@resetshop/ui/confirm-dialog/confirm-dialog'
import { AuthStore } from '@store/auth/auth.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { UsersStore } from '@store/users/users.store'

@Component({
	selector: 'app-user-account-actions',
	standalone: true,
	imports: [Button, ConfirmDialog, HasPermissionDirective, TranslatePipe],
	template: `
		@if (hasAnyAction()) {
			<section class="border-border bg-card rounded-xl border p-4 sm:p-5" aria-labelledby="account-actions-title">
				<h2 id="account-actions-title" class="text-foreground text-lg font-semibold">
					{{ 'USERS.DETAIL.ACCOUNT.TITLE' | translate }}
				</h2>

				<div class="mt-4 flex flex-col gap-3 sm:flex-row">
					<button
						(click)="resetPasswordDialog.show()"
						*hasPermission="'admin:users:reset_password'"
						appButton
						variant="outline"
					>
						{{ 'USERS.DETAIL.ACCOUNT.RESET_PASSWORD' | translate }}
					</button>
					<button (click)="statusDialog.show()" *hasPermission="'admin:users:disable'" appButton variant="outline">
						{{ statusActionLabel() | translate }}
					</button>
				</div>
			</section>

			<app-confirm-dialog
				(confirmed)="onResetPasswordConfirmed()"
				[title]="'USERS.PAGE.RESET_PASSWORD_DIALOG.TITLE' | translate"
				[message]="resetPasswordMessage()"
				[confirmText]="'USERS.PAGE.RESET_PASSWORD_BUTTON' | translate"
				#resetPasswordDialog
			/>

			<app-confirm-dialog
				(confirmed)="onStatusConfirmed()"
				[title]="statusDialogTitle() | translate"
				[message]="statusDialogMessage()"
				[confirmText]="statusActionLabel() | translate"
				[confirmVariant]="isActive() ? 'destructive' : 'default'"
				#statusDialog
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAccountActions {
	public readonly user = input.required<IManagedUser>()

	private readonly usersStore = inject(UsersStore)
	private readonly translation = inject(Translation)
	private readonly authStore = inject(AuthStore)
	protected readonly currentUser = inject(CurrentUser)

	/**
	 * Whether any account action is available for the viewed user. False for the self-row (you cannot
	 * reset/disable your own account — avoids admin lockout) and when the actor lacks BOTH the
	 * reset-password and disable permissions. The whole card is hidden when this is false so no empty
	 * titled shell renders. Per-button `*hasPermission` still hides individually-unpermitted buttons.
	 */
	protected readonly hasAnyAction = computed(() => {
		if (this.currentUser.is(this.user())) {
			return false
		}
		const actor = this.authStore.currentUser()
		return !!actor && (actor.hasPermission('admin:users:reset_password') || actor.hasPermission('admin:users:disable'))
	})

	private readonly resetPasswordToast = createMutationToast(this.translation.instant('USERS.RESET_PASSWORD_TOAST'))
	private readonly disableToast = createMutationToast(this.translation.instant('USERS.DETAIL.ACCOUNT.DISABLE_TOAST'))
	private readonly enableToast = createMutationToast(this.translation.instant('USERS.DETAIL.ACCOUNT.ENABLE_TOAST'))

	protected readonly isActive = computed(() => this.user().status === UserStatus.ACTIVE)
	protected readonly statusActionLabel = computed(() =>
		this.isActive() ? 'USERS.DETAIL.ACCOUNT.DISABLE' : 'USERS.DETAIL.ACCOUNT.ENABLE',
	)
	protected readonly statusDialogTitle = computed(() =>
		this.isActive() ? 'USERS.DETAIL.ACCOUNT.DISABLE_DIALOG.TITLE' : 'USERS.DETAIL.ACCOUNT.ENABLE_DIALOG.TITLE',
	)
	protected readonly statusDialogMessage = computed(() => {
		const key = this.isActive()
			? 'USERS.DETAIL.ACCOUNT.DISABLE_DIALOG.MESSAGE'
			: 'USERS.DETAIL.ACCOUNT.ENABLE_DIALOG.MESSAGE'
		return this.translation.instant(key).replace('{name}', this.user().fullName)
	})
	protected readonly resetPasswordMessage = computed(() =>
		this.translation.instant('USERS.PAGE.RESET_PASSWORD_DIALOG.MESSAGE').replace('{email}', this.user().email),
	)

	private readonly resetPasswordToastEffect = effect(() => {
		const resetting = this.usersStore.isResettingPassword()
		const error = this.usersStore.mutationError().resetPassword
		untracked(() => this.resetPasswordToast.handleResult(resetting, error))
	})

	private readonly statusToastEffect = effect(() => {
		const updating = this.usersStore.isUpdating()
		const error = this.usersStore.mutationError().updateStatus
		untracked(() => {
			// Only the submitted toast reacts — the other is unsubmitted and returns null.
			this.disableToast.handleResult(updating, error)
			this.enableToast.handleResult(updating, error)
		})
	})

	protected onResetPasswordConfirmed(): void {
		this.resetPasswordToast.markSubmitted()
		this.usersStore.resetPassword(this.user().id)
	}

	protected onStatusConfirmed(): void {
		const nextStatus = this.isActive() ? UserStatus.DISABLED : UserStatus.ACTIVE
		const toast = this.isActive() ? this.disableToast : this.enableToast
		toast.markSubmitted()
		this.usersStore.updateUserStatus({ id: this.user().id, body: { status: nextStatus } })
	}
}
