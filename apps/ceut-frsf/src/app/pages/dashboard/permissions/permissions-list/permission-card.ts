import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import type { IPermission } from '@domain/access/permission.interface'
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
			@if (permission().description) {
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ permission().description }}</p>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionCard {
	public readonly permission = input.required<IPermission>()
}
