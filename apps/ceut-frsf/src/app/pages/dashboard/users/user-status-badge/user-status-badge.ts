import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { UserStatus } from '@contracts/user/user.constants'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Badge } from '@resetshop/ui/badge/badge'

/**
 * Presentational status pill for a managed user. Centralizes the badge variant and the translated
 * label so every consumer (users list, mobile card, detail page) renders the status identically and
 * localized — previously the list/card rendered the raw capitalized enum value (always English).
 */
@Component({
	selector: 'app-user-status-badge',
	standalone: true,
	imports: [Badge, TranslatePipe],
	template: `
		<span [variant]="variant()" appBadge>{{ labelKey() | translate }}</span>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStatusBadge {
	public readonly status = input.required<UserStatus>()

	private readonly statusLabelKeys = {
		[UserStatus.ACTIVE]: 'COMMON.STATUS.ACTIVE',
		[UserStatus.DISABLED]: 'COMMON.STATUS.DISABLED',
		[UserStatus.DELETED]: 'COMMON.STATUS.DELETED',
	} as const

	protected readonly variant = computed<'default' | 'destructive'>(() =>
		this.status() === UserStatus.ACTIVE ? 'default' : 'destructive',
	)
	protected readonly labelKey = computed(() => this.statusLabelKeys[this.status()])
}
