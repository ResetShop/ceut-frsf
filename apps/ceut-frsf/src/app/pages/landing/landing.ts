import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LandingHeader } from '@components/landing-header/landing-header'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-landing-page',
	imports: [RouterLink, LandingHeader, Button, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="flex h-svh flex-col bg-white dark:bg-black/95">
			<a
				href="#main-content"
				class="text-foreground sr-only rounded bg-white px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 dark:bg-black"
			>
				{{ 'LANDING.SKIP_TO_CONTENT' | translate }}
			</a>
			<app-landing-header />
			<main id="main-content" class="flex-1 overflow-y-auto">
				<section
					aria-labelledby="landing-hero-heading"
					class="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24"
				>
					<h1 id="landing-hero-heading" class="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
						{{ 'LANDING.HERO_HEADING' | translate }}
					</h1>
					<p class="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
						{{ 'LANDING.HERO_SUBHEADING' | translate }}
					</p>
					<div class="mt-8 flex justify-center">
						<a [routerLink]="['/auth/login']" appButton size="lg">
							{{ 'LANDING.HERO_CTA' | translate }}
						</a>
					</div>
				</section>
			</main>
		</div>
	`,
})
export default class LandingPage {}
