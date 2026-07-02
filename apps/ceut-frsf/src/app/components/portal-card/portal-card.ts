import { NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherTag } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { resolveAccentTextColor } from './accent-contrast'
import type { PortalCard as PortalCardModel } from './portal-card.interface'

/**
 * CEUT portal "tarjeta" — the signature resource card. White rounded card by
 * default; a brand `accent` fills the whole card and switches text to the
 * higher-contrast tone (white or near-black), optionally with a tinted `glow`.
 */
@Component({
	selector: 'app-portal-card',
	imports: [NgOptimizedImage, NgIcon, TranslatePipe],
	viewProviders: [provideIcons({ featherTag })],
	host: { class: 'block' },
	template: `
		<div
			[class.bg-card]="!card().accent"
			[style.background]="card().accent || null"
			[style.box-shadow]="cardShadow()"
			class="rounded-2xl p-5"
		>
			<div class="flex items-center gap-4">
				<div class="flex size-16 shrink-0 items-center justify-center">
					<img
						[ngSrc]="'icons/cards/' + card().icon"
						[width]="card().iconWidth"
						[height]="card().iconHeight"
						alt=""
						class="size-16 object-contain"
					/>
				</div>
				<h3 [class]="titleClasses()" class="font-display text-lg leading-snug font-bold">
					{{ card().titleKey | translate }}
				</h3>
			</div>
			<p [class]="bodyClasses()" class="mt-3 text-base leading-normal">
				{{ card().textKey | translate }}
			</p>
			@if (card().footerKey) {
				<div [class]="footerClasses()" class="mt-3 flex items-center border-t pt-2 text-xs">
					<ng-icon name="featherTag" class="mr-1.5 opacity-60" aria-hidden="true" />
					{{ card().footerKey! | translate }}
				</div>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalCard {
	public readonly card = input.required<PortalCardModel>()

	private readonly tone = computed(() => {
		const accent = this.card().accent
		return accent ? resolveAccentTextColor(accent) : null
	})

	protected readonly cardShadow = computed(() => {
		const { glow, accent } = this.card()
		return glow && accent ? `0 4px 20px 0 ${accent}26, 0 7px 10px -5px ${accent}73` : 'var(--shadow-card)'
	})

	protected readonly titleClasses = computed(() => {
		const tone = this.tone()
		if (!tone) return 'text-card-foreground'
		return tone === 'light' ? 'text-white' : 'text-gray-900'
	})

	protected readonly bodyClasses = computed(() => {
		const tone = this.tone()
		if (!tone) return 'text-card-foreground/80'
		return tone === 'light' ? 'text-white/90' : 'text-gray-900/85'
	})

	protected readonly footerClasses = computed(() => {
		const tone = this.tone()
		if (!tone) return 'border-border text-muted-foreground'
		return tone === 'light' ? 'border-white/25 text-white/80' : 'border-gray-900/20 text-gray-900/75'
	})
}
