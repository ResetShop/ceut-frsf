import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherRefreshCw } from '@ng-icons/feather-icons'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-brand',
	imports: [Button, NgIcon, RouterLink],
	host: { class: 'flex items-center p-2' },
	template: `
		<!--	TODO: Replace with the navigation to your home page / initial page -->
		<a
			[routerLink]="['..', 'dashboard']"
			[fullWidth]="true"
			appButton
			variant="default"
			size="sm"
			class="gap-2 font-semibold"
		>
			<ng-icon name="featherRefreshCw" data-icon="start" />
			<span class="min-w-0 truncate">Reset Starter Repo</span>
		</a>
	`,
	viewProviders: [provideIcons({ featherRefreshCw })],
})
export class Brand {}
