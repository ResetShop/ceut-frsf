import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmDialog } from '@resetshop/ui/confirm-dialog/confirm-dialog'

@Component({
	selector: 'app-user-danger-zone',
	standalone: true,
	imports: [Button, ConfirmDialog, HasPermissionDirective, TranslatePipe],
	template: `
		@if (!currentUser.is(user())) {
			<section
				class="border-destructive/30 bg-destructive/5 rounded-xl border p-4 sm:p-5"
				aria-labelledby="danger-zone-title"
			>
				<h2 id="danger-zone-title" class="text-destructive text-lg font-semibold">
					{{ 'USERS.DETAIL.DANGER.TITLE' | translate }}
				</h2>
				<p class="text-muted-foreground mt-1 text-sm">{{ 'USERS.DETAIL.DANGER.DESCRIPTION' | translate }}</p>

				<div class="mt-4 flex justify-end">
					<button (click)="deleteDialog.show()" *hasPermission="'admin:users:delete'" appButton variant="destructive">
						{{ 'USERS.DETAIL.DANGER.DELETE' | translate }}
					</button>
				</div>
			</section>

			<app-confirm-dialog
				(confirmed)="deleteConfirmed.emit()"
				[title]="'USERS.PAGE.DELETE_DIALOG.TITLE' | translate"
				[message]="deleteMessage()"
				[confirmText]="'COMMON.DELETE' | translate"
				confirmVariant="destructive"
				#deleteDialog
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDangerZone {
	public readonly user = input.required<IManagedUser>()

	/**
	 * Emitted when the admin confirms deletion. The parent page owns the delete dispatch, success toast,
	 * and navigation — a successful delete nulls `selectedUser`, which tears down this component, so the
	 * post-delete reaction must live on the surviving page, not here.
	 */
	public readonly deleteConfirmed = output<void>()

	private readonly translation = inject(Translation)
	protected readonly currentUser = inject(CurrentUser)

	protected readonly deleteMessage = computed(() =>
		this.translation.instant('USERS.PAGE.DELETE_DIALOG.MESSAGE').replace('{name}', this.user().fullName),
	)
}
