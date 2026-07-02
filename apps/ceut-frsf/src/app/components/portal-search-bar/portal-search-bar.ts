import { ChangeDetectionStrategy, Component, model } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherSearch } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'

/**
 * CEUT portal search bar — a joined search-icon prefix and input that filters
 * the resource grid live. Two-way bound via the `value` model signal; the
 * parent owns the filtering.
 */
@Component({
	selector: 'app-portal-search-bar',
	imports: [NgIcon, TranslatePipe],
	viewProviders: [provideIcons({ featherSearch })],
	host: { class: 'block' },
	template: `
		<div class="flex w-full max-w-[22.5rem] items-stretch rounded-md shadow-sm">
			<span
				class="border-input bg-card text-muted-foreground flex items-center justify-center rounded-l-md border border-r-0 px-3.5"
			>
				<ng-icon name="featherSearch" aria-hidden="true" />
			</span>
			<input
				(input)="onInput($event)"
				[value]="value()"
				[placeholder]="'LANDING.PORTAL.SEARCH_PLACEHOLDER' | translate"
				[attr.aria-label]="'LANDING.PORTAL.SEARCH_PLACEHOLDER' | translate"
				type="search"
				class="border-input bg-card text-foreground min-w-0 flex-1 rounded-r-md border border-l-0 px-3.5 py-2.5 text-base outline-none focus:border-[var(--action-blue)] focus:ring-1 focus:ring-[var(--action-blue)]"
			/>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalSearchBar {
	public readonly value = model('')

	protected onInput(event: Event): void {
		this.value.set((event.target as HTMLInputElement).value)
	}
}
