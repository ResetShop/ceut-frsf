import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ThemeToggle } from '@components/theme-toggle/theme-toggle'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherMenu } from '@ng-icons/feather-icons'
import { Button } from '@resetshop/ui/button/button'
import { UIStore } from '@store/ui/ui.store'
import { Breadcrumb } from '../breadcrumb/breadcrumb'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appHeader]',
	imports: [Breadcrumb, ThemeToggle, Button, NgIcon],
	viewProviders: [provideIcons({ featherMenu })],
	host: { class: 'flex h-full items-center px-2 sm:px-4 text-foreground' },
	template: `
		<div class="flex w-full items-center justify-between">
			<div class="flex items-center gap-2">
				<button
					(click)="uiStore.toggleSidebar()"
					appButton
					variant="ghost"
					size="sm"
					class="lg:hidden"
					aria-label="Open navigation menu"
				>
					<ng-icon name="featherMenu" />
				</button>
				<app-breadcrumb />
			</div>
			<app-theme-toggle />
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
	protected readonly uiStore = inject(UIStore)
}
