import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Badge } from '@resetshop/ui/badge/badge'
import { Button } from '@resetshop/ui/button/button'
import { EditUserRolesDrawer } from './edit-user-roles-drawer'

@Component({
	selector: 'app-user-roles-section',
	standalone: true,
	imports: [Badge, Button, HasPermissionDirective, EditUserRolesDrawer, TranslatePipe],
	template: `
		<section class="border-border bg-card rounded-xl border p-4 sm:p-5" aria-labelledby="roles-section-title">
			<div class="flex items-start justify-between gap-3">
				<h2 id="roles-section-title" class="text-foreground text-lg font-semibold">
					{{ 'USERS.DETAIL.ROLES.TITLE' | translate }}
				</h2>
				<button
					(click)="rolesDrawer.open()"
					*hasPermission="'admin:users:update'"
					appButton
					variant="outline"
					size="sm"
					data-touch-target
				>
					{{ 'USERS.DETAIL.ROLES.EDIT_BUTTON' | translate }}
				</button>
			</div>

			<div class="mt-4">
				@if (user().roles.length > 0) {
					<div class="flex flex-wrap gap-2">
						@for (role of user().roles; track role.id) {
							<span appBadge>{{ role.name }}</span>
						}
					</div>
				} @else {
					<p class="text-muted-foreground text-sm">{{ 'USERS.DETAIL.ROLES.EMPTY' | translate }}</p>
				}
			</div>
		</section>

		<app-edit-user-roles-drawer [user]="user()" #rolesDrawer />
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRolesSection {
	public readonly user = input.required<IManagedUser>()
}
