import { BreakpointObserver } from '@angular/cdk/layout'
import { isPlatformBrowser } from '@angular/common'
import { Component, computed, effect, inject, PLATFORM_ID, signal, type Signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { Brand } from '@components/brand/brand'
import NavSection from '@components/nav-section/nav-section'
import { provideIcons } from '@ng-icons/core'
import { featherLogOut, featherSettings, featherUser } from '@ng-icons/feather-icons'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import type { MenuItem } from '@resetshop/ui/menu/menu'
import { UserMenu } from '@resetshop/ui/user-menu/user-menu'
import { AuthStore } from '@store/auth/auth.store'
import { UIStore } from '@store/ui/ui.store'
import type { NgpMenuPlacement } from 'ng-primitives/menu'
import { map } from 'rxjs'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appSidebar]',
	host: {
		'[attr.data-mobile-open]': 'uiStore.isSidebarOpen() || null',
		'(document:keydown.escape)': 'onEscape()',
	},
	imports: [NavSection, Brand, UserMenu],
	providers: [NavigationState],
	viewProviders: [provideIcons({ featherUser, featherSettings, featherLogOut })],
	template: `
		<div class="brand-container">
			<app-brand />
		</div>
		<div class="nav-container">
			@for (section of sections(); track section.id) {
				<app-nav-section [section]="section" class="px-2" />
			}
		</div>
		<div class="footer">
			@if (authStore.currentUser(); as user) {
				<app-user-menu
					[name]="user.fullName"
					[email]="user.email"
					[initials]="initials()"
					[items]="userMenuItems()"
					[placement]="userMenuPlacement()"
					class="min-w-0 flex-1"
				/>
			}
		</div>
	`,
	styles: `
		:host {
			@apply grid h-svh min-w-0 grid-rows-[64px_1fr_auto] overflow-hidden;

			.brand-container {
				@apply p-2;
			}

			.nav-container {
				@apply flex flex-col gap-2 overflow-y-auto;
			}

			.footer {
				@apply border-border flex min-h-16 items-center border-t p-2;
			}
		}

		@media (max-width: 1023px) {
			:host {
				position: fixed;
				left: 0;
				top: 0;
				bottom: 0;
				width: var(--sidebar-width-mobile, min(280px, 80vw));
				z-index: 50;
				transform: translateX(-100%);
				transition: transform 200ms ease;
			}

			:host[data-mobile-open] {
				transform: translateX(0);
			}
		}
	`,
})
export class Sidebar {
	protected readonly authStore = inject(AuthStore)
	private readonly translation = inject(Translation)
	private readonly navigation = inject(Navigation)
	private readonly router = inject(Router)
	private readonly platformId = inject(PLATFORM_ID)
	protected readonly uiStore = inject(UIStore)
	protected readonly sections = computed(() => this.navigation.sections())

	private readonly isLgViewport = this.createLgViewportSignal()

	protected readonly initials = computed(() => {
		const user = this.authStore.currentUser()
		return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : ''
	})

	// Translated here rather than in the template because the menu takes finished labels; instant()
	// reads the current language signal, so the labels follow a language switch.
	protected readonly userMenuItems = computed<MenuItem[][]>(() => [
		[
			{ label: this.translation.instant('ACCOUNT.NAV'), icon: 'featherUser', route: '/account' },
			{ label: this.translation.instant('SETTINGS.NAV'), icon: 'featherSettings', route: '/dashboard/settings' },
		],
		[{ label: this.translation.instant('COMMON.LOGOUT'), icon: 'featherLogOut', onSelect: () => this.logout() }],
	])

	// The mobile drawer is too narrow to open the menu beside the tile, so it opens upwards there.
	protected readonly userMenuPlacement = computed<NgpMenuPlacement>(() => (this.isLgViewport() ? 'right-end' : 'top'))

	private readonly logoutNavigationEffect = effect(() => {
		const user = this.authStore.currentUser()
		const isLoggingOut = this.authStore.isLoggingOut()

		if (!user && !isLoggingOut) {
			this.router.navigate(['/auth/login'])
		}
	})

	protected onEscape(): void {
		if (this.uiStore.isSidebarOpen()) {
			this.uiStore.setSidebarOpen(false)
		}
	}

	private logout(): void {
		this.authStore.logout()
	}

	private createLgViewportSignal(): Signal<boolean> {
		if (!isPlatformBrowser(this.platformId)) return signal(false).asReadonly()
		const lg = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-lg').trim() || '64rem'
		return toSignal(
			inject(BreakpointObserver)
				.observe(`(min-width: ${lg})`)
				.pipe(map((s) => s.matches)),
			{ initialValue: false },
		)
	}
}
