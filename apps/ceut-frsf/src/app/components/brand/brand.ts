import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-brand',
	imports: [Button, RouterLink],
	host: { class: 'flex items-center p-2' },
	template: `
		<a
			[routerLink]="['/dashboard']"
			[fullWidth]="true"
			appButton
			variant="default"
			size="sm"
			class="gap-2 font-semibold"
		>
			@if (collapsed()) {
				<img src="logo/ceut-icon.png" width="32" height="32" alt="CEUT FRSF" class="size-8 shrink-0" />
			} @else {
				<img src="logo/ceut-logo.svg" alt="CEUT FRSF" class="h-8 w-auto" />
			}
		</a>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brand {
	public readonly collapsed = input(false)
}
