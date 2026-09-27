import { Component, input } from '@angular/core'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'

/** Read-only profile summary. Profile edits go through the page's Edit User drawer. */
@Component({
	selector: 'app-user-profile-section',
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<section class="border-border bg-card rounded-xl border p-4 sm:p-5" aria-labelledby="profile-section-title">
			<h2 id="profile-section-title" class="text-foreground text-lg font-semibold">
				{{ 'USERS.DETAIL.PROFILE.TITLE' | translate }}
			</h2>

			<dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<dt class="text-muted-foreground text-sm">{{ 'USERS.DETAIL.PROFILE.FIRST_NAME' | translate }}</dt>
					<dd class="text-foreground mt-1 font-medium break-words">{{ user().firstName }}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-sm">{{ 'USERS.DETAIL.PROFILE.LAST_NAME' | translate }}</dt>
					<dd class="text-foreground mt-1 font-medium break-words">{{ user().lastName }}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-sm">{{ 'USERS.DETAIL.PROFILE.EMAIL' | translate }}</dt>
					<dd class="text-foreground mt-1 font-medium break-all">{{ user().email }}</dd>
				</div>
			</dl>
		</section>
	`,
})
export class UserProfileSection {
	public readonly user = input.required<IManagedUser>()
}
