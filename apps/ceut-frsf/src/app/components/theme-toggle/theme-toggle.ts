import { isPlatformBrowser } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherMoon, featherSun } from '@ng-icons/feather-icons'
import { ThemeProvider } from '@resetshop/angular-core/theme/theme.abstract'
import { Button } from '@resetshop/ui/button/button'

@Component({
	selector: 'app-theme-toggle',
	standalone: true,
	imports: [Button, NgIcon],
	providers: [provideIcons({ featherSun, featherMoon })],
	template: `
		@if (isBrowser()) {
			<button
				(click)="toggleTheme()"
				[attr.aria-label]="isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
				appButton
				variant="ghost"
				size="sm"
				class="animate-slide-in-from-right rounded-lg"
			>
				<ng-icon [attr.aria-hidden]="true" [name]="buttonIcon()" />
			</button>
		}
	`,
	styles: `
		@keyframes slide-in-from-right {
			from {
				opacity: 0;
				transform: translateX(100%);
			}
			to {
				opacity: 1;
				transform: translateX(0);
			}
		}

		:host {
			display: contents;
		}

		.animate-slide-in-from-right {
			animation: slide-in-from-right 0.5s ease-out;
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
	private readonly theme = inject(ThemeProvider)
	private readonly platformId = inject(PLATFORM_ID)

	protected readonly isBrowser = computed(() => isPlatformBrowser(this.platformId))
	protected readonly isDarkMode = computed(() => this.theme.isDarkMode())
	protected readonly buttonIcon = computed(() => (this.isDarkMode() ? 'featherMoon' : 'featherSun'))

	protected toggleTheme(): void {
		this.theme.toggleTheme()
	}
}
