import { Component, input } from '@angular/core'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Badge } from '@resetshop/ui/badge/badge'

/** Read-only list of the user's roles. Role edits go through the page's Edit User drawer. */
@Component({
	selector: 'app-user-roles-section',
	standalone: true,
	imports: [Badge, TranslatePipe],
	template: `
		<section class="border-border bg-card rounded-xl border p-4 sm:p-5" aria-labelledby="roles-section-title">
			<h2 id="roles-section-title" class="text-foreground text-lg font-semibold">
				{{ 'USERS.DETAIL.ROLES.TITLE' | translate }}
			</h2>

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
	`,
})
export class UserRolesSection {
	public readonly user = input.required<IManagedUser>()
}
