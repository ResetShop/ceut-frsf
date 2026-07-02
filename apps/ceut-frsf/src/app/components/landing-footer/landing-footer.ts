import { NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'

/**
 * CEUT portal footer — the deep brand-blue band with the raised-hands mark,
 * the centre name and tagline, and the Instagram/Discord links.
 */
@Component({
	selector: 'app-landing-footer',
	imports: [NgOptimizedImage, TranslatePipe],
	host: { class: 'block' },
	template: `
		<footer class="mt-6 bg-[var(--ceut-blue-900)] px-5 py-7 text-white/85">
			<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<img ngSrc="logo/hands-icon.png" width="144" height="144" alt="" class="size-10" />
					<div>
						<div class="font-bold text-white">{{ 'LANDING.BRAND_NAME' | translate }}</div>
						<div class="text-xs">{{ 'LANDING.PORTAL.FOOTER.TAGLINE' | translate }}</div>
					</div>
				</div>
				<div class="flex items-center gap-3.5">
					<a
						[href]="instagramUrl"
						[attr.aria-label]="'LANDING.PORTAL.FOOTER.INSTAGRAM_TITLE' | translate"
						[title]="'LANDING.PORTAL.FOOTER.INSTAGRAM_TITLE' | translate"
						target="_blank"
						rel="noopener"
					>
						<img ngSrc="icons/social/instagram.png" width="512" height="512" alt="" class="size-8" />
					</a>
					<a
						[href]="discordUrl"
						[attr.aria-label]="'LANDING.PORTAL.FOOTER.DISCORD_TITLE' | translate"
						[title]="'LANDING.PORTAL.FOOTER.DISCORD_TITLE' | translate"
						target="_blank"
						rel="noopener"
					>
						<img ngSrc="icons/social/discord.png" width="512" height="512" alt="" class="size-8" />
					</a>
				</div>
			</div>
		</footer>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFooter {
	protected readonly instagramUrl = 'https://instagram.com/ceut.frsf'
	protected readonly discordUrl = 'https://discord.com/invite/BJ7wP7S'
}
