import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IRole } from '@domain/access/role.interface'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherEdit3, featherTrash2 } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Badge } from '@resetshop/ui/badge/badge'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-role-card',
	standalone: true,
	imports: [Badge, Button, HasPermissionDirective, NgIcon, TranslatePipe],
	viewProviders: [provideIcons({ featherEdit3, featherTrash2 })],
	template: `
		<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-start justify-between gap-2">
				<p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ role().name }}</p>
				<span appBadge variant="secondary">{{ role().code }}</span>
			</div>
			@if (role().description) {
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ role().description }}</p>
			}
			<!-- gap-4 (16px) > data-touch-target -inset-3 (12px) — prevents sibling hit-area overlap. -->
			<div class="mt-3 flex gap-4">
				<button
					(click)="edit.emit()"
					*hasPermission="'admin:roles:update'"
					appButton
					variant="ghost"
					size="sm"
					data-touch-target
				>
					<ng-icon data-icon="start" name="featherEdit3" />
					{{ 'COMMON.EDIT' | translate }}
				</button>
				<ng-container *hasPermission="'admin:roles:delete'">
					@if (role().removable) {
						<button
							(click)="delete.emit()"
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
				</ng-container>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleCard {
	public readonly role = input.required<IRole>()
	public readonly edit = output<void>()
	public readonly delete = output<void>()
}
