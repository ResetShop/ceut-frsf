import { NgOptimizedImage } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ThemeToggle } from '@components/theme-toggle/theme-toggle'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-landing-header',
	imports: [RouterLink, ThemeToggle, Button, TranslatePipe, NgOptimizedImage],
	template: `
		<header class="border-border bg-card border-b">
			<div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
				<div class="flex flex-1 items-center">
					<a
						[href]="instagramUrl"
						[attr.aria-label]="'LANDING.PORTAL.INSTAGRAM_TITLE' | translate"
						[title]="'LANDING.PORTAL.INSTAGRAM_TITLE' | translate"
						target="_blank"
						rel="noopener"
						class="inline-flex"
					>
						<img ngSrc="icons/social/instagram.png" width="512" height="512" alt="" class="size-7" />
					</a>
				</div>
				<a [routerLink]="['/']" [attr.aria-label]="'LANDING.BRAND_NAME' | translate" class="inline-flex shrink-0">
					<img ngSrc="logo/ceut-logo.svg" width="277" height="84" alt="CEUT FRSF" class="h-8 w-auto" />
				</a>
				<div class="flex flex-1 items-center justify-end gap-2">
					<app-theme-toggle />
					<!-- data-touch-target is on the primary Login CTA only; applying it to both adjacent links would overlap their extended hit areas across the gap-2 spacing -->
					<a [routerLink]="['/auth/login']" appButton variant="default" size="sm" data-touch-target>
						{{ 'LANDING.LOGIN_BUTTON' | translate }}
					</a>
				</div>
			</div>
		</header>
	`,
	styles: `
		:host {
			display: block;
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeader {
	protected readonly instagramUrl = 'https://instagram.com/ceut.frsf'
}
