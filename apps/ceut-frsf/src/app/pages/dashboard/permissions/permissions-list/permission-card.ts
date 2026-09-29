import { Component, computed, inject, input } from '@angular/core'
import type { IPermission } from '@domain/access/permission.interface'
import { permissionDescriptionKey } from '@providers/i18n/permission-description-key'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Badge } from '@resetshop/ui/badge/badge'

@Component({
	selector: 'app-permission-card',
	standalone: true,
	imports: [Badge],
	template: `
		<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
			<div class="flex items-start justify-between gap-2">
				<p class="font-medium text-gray-900 dark:text-gray-100">
					{{ permission().resource }} · {{ permission().action }}
				</p>
				<span appBadge variant="secondary">{{ permission().identifier }}</span>
			</div>
			@if (description()) {
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ description() }}</p>
			}
		</div>
	`,
})
export class PermissionCard {
	public readonly permission = input.required<IPermission>()

	private readonly translation = inject(Translation)

	/**
	 * The description in the active language. A permission with no stored description
	 * renders no paragraph at all, so the catalogue's English text — which the API returns
	 * and which doubles as the `instant()` fallback — also gates visibility.
	 */
	protected readonly description = computed(() => {
		const permission = this.permission()
		if (!permission.description) return null
		return this.translation.instant(permissionDescriptionKey(permission.identifier), permission.description)
	})
}
