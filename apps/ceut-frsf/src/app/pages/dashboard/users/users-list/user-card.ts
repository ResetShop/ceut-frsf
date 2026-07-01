import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherEdit3, featherKey, featherTrash2 } from '@ng-icons/feather-icons'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Button } from '@resetshop/ui/button/button'
import { UserStatusBadge } from '../user-status-badge/user-status-badge'

@Component({
	selector: 'app-user-card',
	standalone: true,
	imports: [Button, HasPermissionDirective, NgIcon, TranslatePipe, UserStatusBadge],
	viewProviders: [provideIcons({ featherEdit3, featherKey, featherTrash2 })],
	template: `
		<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ user().fullName }}</p>
					<p class="truncate text-sm text-gray-500 dark:text-gray-400">{{ user().email }}</p>
				</div>
				<app-user-status-badge [status]="user().status" />
			</div>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ formattedRoles() }}</p>
			<!-- gap-4 (16px) > data-touch-target -inset-3 (12px) — prevents sibling hit-area overlap. -->
			<div class="mt-3 flex gap-4">
				<button
					(click)="edit.emit()"
					*hasPermission="'admin:users:update'"
					appButton
					variant="ghost"
					size="sm"
					data-touch-target
				>
					<ng-icon data-icon="start" name="featherEdit3" />
					{{ 'COMMON.EDIT' | translate }}
				</button>
				@if (!currentUser.is(user())) {
					<button
						(click)="resetPassword.emit()"
						*hasPermission="'admin:users:reset_password'"
						appButton
						variant="ghost"
						size="sm"
						data-touch-target
					>
						<ng-icon data-icon="start" name="featherKey" />
						{{ 'USERS.PAGE.RESET_PASSWORD_BUTTON' | translate }}
					</button>
				}
				@if (!currentUser.is(user())) {
					<button
						(click)="delete.emit()"
						*hasPermission="'admin:users:delete'"
						appButton
						variant="ghost"
						size="sm"
						class="text-destructive"
						data-touch-target
					>
						<ng-icon data-icon="start" name="featherTrash2" />
						{{ 'COMMON.DELETE' | translate }}
					</button>
				}
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCard {
	public readonly user = input.required<IManagedUser>()
	public readonly edit = output<void>()
	public readonly delete = output<void>()
	public readonly resetPassword = output<void>()

	protected readonly currentUser = inject(CurrentUser)

	protected formattedRoles(): string {
		const roles = this.user().roles
		return roles.length ? roles.map((r) => r.name).join(', ') : '—'
	}
}
