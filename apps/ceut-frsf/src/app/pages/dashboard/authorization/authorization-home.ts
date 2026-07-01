import { ChangeDetectionStrategy, Component } from '@angular/core'
import { featherKey, featherShield } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import NavigationCard from '@resetshop/ui/navigation-card/navigation-card'

@Component({
	selector: 'app-authorization-home',
	imports: [NavigationCard, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="space-y-4">
			<h2 class="text-foreground text-lg font-semibold">{{ 'DASHBOARD.AUTHORIZATION.TITLE' | translate }}</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<app-navigation-card
					[icon]="rolesIcon"
					[name]="'DASHBOARD.AUTHORIZATION.ROLES_CARD.NAME' | translate"
					[description]="'DASHBOARD.AUTHORIZATION.ROLES_CARD.DESCRIPTION' | translate"
					route="/dashboard/authorization/roles"
				/>
				<app-navigation-card
					[icon]="permissionsIcon"
					[name]="'DASHBOARD.AUTHORIZATION.PERMISSIONS_CARD.NAME' | translate"
					[description]="'DASHBOARD.AUTHORIZATION.PERMISSIONS_CARD.DESCRIPTION' | translate"
					route="/dashboard/authorization/permissions"
				/>
			</div>
		</div>
	`,
})
export default class AuthorizationHome {
	protected readonly rolesIcon: Record<string, string> = { featherShield }
	protected readonly permissionsIcon: Record<string, string> = { featherKey }
}
