import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'

import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronRight } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import type { BreadcrumbItem } from '@resetshop/angular-core/interfaces/navigation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'

type BreadcrumbViewport = 'all' | 'mobile' | 'desktop'

type BreadcrumbEntry =
	| { kind: 'item'; item: BreadcrumbItem; viewport: BreadcrumbViewport }
	| { kind: 'chevron'; viewport: BreadcrumbViewport }
	| { kind: 'ellipsis'; viewport: BreadcrumbViewport }

@Component({
	selector: 'app-breadcrumb',
	standalone: true,
	imports: [NgIcon, RouterLink, TranslatePipe],
	providers: [provideIcons({ featherChevronRight })],
	template: `
		<nav class="flex min-w-0 items-center gap-1" aria-label="Breadcrumb">
			<ol class="flex min-w-0 items-center gap-1">
				@for (entry of entries(); track $index) {
					<li
						[class.hidden]="entry.viewport === 'desktop'"
						[class.sm:inline-flex]="entry.viewport === 'desktop'"
						[class.sm:hidden]="entry.viewport === 'mobile'"
						class="min-w-0"
					>
						@switch (entry.kind) {
							@case ('item') {
								<div class="flex items-center gap-1">
									@if (!entry.item.isActive) {
										<a
											[routerLink]="entry.item.path"
											class="text-muted-foreground hover:text-foreground max-w-[8rem] truncate text-sm font-medium sm:max-w-none"
										>
											{{ entry.item.title | translate }}
										</a>
									}
									@if (entry.item.isActive) {
										<span
											[attr.title]="entry.item.title | translate"
											class="text-foreground max-w-[14rem] truncate text-sm font-medium sm:max-w-none"
											aria-current="page"
										>
											{{ entry.item.title | translate }}
										</span>
									}
								</div>
							}
							@case ('chevron') {
								<span class="text-muted-foreground flex items-center justify-center" aria-hidden="true">
									<ng-icon [size]="'0.75rem'" name="featherChevronRight" />
								</span>
							}
							@case ('ellipsis') {
								<span class="text-muted-foreground text-sm font-medium" aria-hidden="true">…</span>
							}
						}
					</li>
				}
			</ol>
		</nav>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Breadcrumb {
	private readonly navigation = inject(Navigation)
	protected readonly breadcrumbs = computed(() => this.navigation.breadcrumbs())

	/**
	 * Flat entry list for the breadcrumb `<ol>`. For chains of 3+ items the trail is rendered with
	 * a mobile-only ellipsis (`first › … › last`) and a desktop-only intermediate sequence
	 * (`first › a › b › … › last`), all in the same DOM. Each entry's `viewport` field maps to a
	 * Tailwind visibility rule on the wrapping `<li>`.
	 */
	protected readonly entries = computed((): BreadcrumbEntry[] => {
		const items = this.breadcrumbs()
		if (items.length === 0) return []

		const entries: BreadcrumbEntry[] = [{ kind: 'item', item: items[0], viewport: 'all' }]

		if (items.length === 1) return entries

		entries.push({ kind: 'chevron', viewport: 'all' })

		if (items.length === 2) {
			entries.push({ kind: 'item', item: items[1], viewport: 'all' })
			return entries
		}

		// 3+ items: mobile shows `first › … › last`; desktop shows the full chain.
		entries.push({ kind: 'ellipsis', viewport: 'mobile' })
		entries.push({ kind: 'chevron', viewport: 'mobile' })

		for (let i = 1; i < items.length - 1; i++) {
			entries.push({ kind: 'item', item: items[i], viewport: 'desktop' })
			entries.push({ kind: 'chevron', viewport: 'desktop' })
		}

		entries.push({ kind: 'item', item: items[items.length - 1], viewport: 'all' })
		return entries
	})
}
