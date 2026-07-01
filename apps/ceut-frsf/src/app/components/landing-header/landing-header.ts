import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ThemeToggle } from '@components/theme-toggle/theme-toggle'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-landing-header',
	imports: [RouterLink, ThemeToggle, Button, TranslatePipe],
	template: `
		<header class="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-black/95">
			<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
				<a [routerLink]="['/']" class="text-foreground text-base font-semibold sm:text-lg">
					{{ 'LANDING.BRAND_NAME' | translate }}
				</a>
				<div class="flex items-center gap-2">
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
export class LandingHeader {}
