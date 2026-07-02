import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { LandingFooter } from '@components/landing-footer/landing-footer'
import { LandingHeader } from '@components/landing-header/landing-header'
import { PortalCard } from '@components/portal-card/portal-card'
import { PortalSearchBar } from '@components/portal-search-bar/portal-search-bar'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { CEUT_PORTAL_CARDS } from './portal-cards.data'

@Component({
	selector: 'app-landing-page',
	imports: [LandingHeader, LandingFooter, PortalCard, PortalSearchBar, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="bg-background flex h-svh flex-col">
			<a
				href="#main-content"
				class="text-foreground bg-card sr-only rounded px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
			>
				{{ 'LANDING.SKIP_TO_CONTENT' | translate }}
			</a>
			<app-landing-header />
			<main id="main-content" class="flex-1 overflow-y-auto">
				<div role="search" class="bg-secondary flex justify-center px-4 py-3.5 shadow-sm">
					<app-portal-search-bar [(value)]="searchQuery" />
				</div>

				<section aria-labelledby="landing-hero-heading" class="mx-auto max-w-5xl px-5 pt-7 pb-2">
					<p class="text-sm font-bold tracking-[0.08em] text-[var(--ceut-primary)] uppercase">
						{{ 'LANDING.PORTAL.EYEBROW' | translate }}
					</p>
					<h1
						id="landing-hero-heading"
						class="text-foreground font-display mt-1.5 text-3xl font-extrabold tracking-tight"
					>
						{{ 'LANDING.HERO_HEADING' | translate }}
					</h1>
					<p class="text-muted-foreground mt-2 max-w-xl text-lg">
						{{ 'LANDING.HERO_SUBHEADING' | translate }}
					</p>
				</section>

				<h2 class="sr-only">{{ 'LANDING.PORTAL.SECTION_HEADING' | translate }}</h2>
				<div aria-live="polite">
					@if (filteredCards().length > 0) {
						<ul role="list" class="mx-auto max-w-5xl columns-1 gap-4 px-5 pb-8 sm:columns-2 lg:columns-3">
							@for (card of filteredCards(); track card.id) {
								<li class="mb-4 break-inside-avoid">
									<app-portal-card [card]="card" />
								</li>
							}
						</ul>
					} @else {
						<p class="text-muted-foreground mx-auto max-w-5xl px-5 pb-8 text-lg">{{ emptyMessage() }}</p>
					}
				</div>
			</main>
			<app-landing-footer />
		</div>
	`,
})
export default class LandingPage {
	private readonly translation = inject(Translation)

	protected readonly searchQuery = signal('')

	protected readonly filteredCards = computed(() => {
		const query = this.searchQuery().trim().toLowerCase()
		if (!query) return CEUT_PORTAL_CARDS
		return CEUT_PORTAL_CARDS.filter((card) => {
			const haystack =
				`${this.translation.instant(card.titleKey)} ${this.translation.instant(card.textKey)} ${card.category}`.toLowerCase()
			return haystack.includes(query)
		})
	})

	protected readonly emptyMessage = computed(() =>
		this.translation.instant('LANDING.PORTAL.EMPTY_STATE').replace('{query}', this.searchQuery().trim()),
	)
}
