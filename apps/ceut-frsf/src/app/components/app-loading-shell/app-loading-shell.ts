import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { Spinner } from '@resetshop/ui/spinner/spinner'

@Component({
	selector: 'app-loading-shell',
	imports: [Spinner],
	template: `
		<ng-content />
		@if (loading()) {
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/80" role="status">
				<app-spinner class="text-primary size-8" aria-label="Loading..." />
			</div>
		}
	`,
	host: { class: 'relative block' },
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLoadingShell {
	public readonly loading = input.required<boolean>()
}
