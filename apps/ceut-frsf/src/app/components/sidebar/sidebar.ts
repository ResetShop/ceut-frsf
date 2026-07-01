import { BreakpointObserver } from '@angular/cdk/layout'
import { isPlatformBrowser } from '@angular/common'
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	PLATFORM_ID,
	signal,
	type Signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { Brand } from '@components/brand/brand'
import NavSection from '@components/nav-section/nav-section'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronsLeft, featherChevronsRight } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'
import { Button } from '@resetshop/ui/button/button'
import { AuthStore } from '@store/auth/auth.store'
import { UIStore } from '@store/ui/ui.store'
import { map } from 'rxjs'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appSidebar]',
	host: {
		'[class.collapsed]': 'isCollapsed()',
		'[attr.data-collapsed]': 'isCollapsed() || null',
		'[attr.data-mobile-open]': 'uiStore.isSidebarOpen() || null',
		'(document:keydown.control.b)': 'onCollapseShortcut($event)',
		'(document:keydown.meta.b)': 'onCollapseShortcut($event)',
		'(document:keydown.escape)': 'onEscape()',
	},
	imports: [Button, NavSection, Brand, NgIcon, TranslatePipe],
	providers: [NavigationState],
	viewProviders: [provideIcons({ featherChevronsLeft, featherChevronsRight })],
	template: `
		<div class="brand-container">
			<app-brand [collapsed]="isCollapsed()" />
		</div>
		<div class="nav-container">
			@for (section of sections(); track section.id; let first = $first) {
				@if (isCollapsed() && !first) {
					<hr class="border-border" />
				}
				<app-nav-section [section]="section" [collapsed]="isCollapsed()" [class.px-2]="!isCollapsed()" />
			}
		</div>
		<div class="footer">
			@if (!isCollapsed()) {
				<button (click)="logout()" appButton variant="link">{{ 'COMMON.LOGOUT' | translate }}</button>
			}
			@if (isLgViewport()) {
				<button
					(click)="toggleCollapse()"
					[attr.aria-label]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
					class="me-2"
					appButton
					variant="ghost"
					size="icon"
				>
					<ng-icon
						[name]="isCollapsed() ? 'featherChevronsRight' : 'featherChevronsLeft'"
						[size]="isCollapsed() ? '24' : '20'"
					/>
				</button>
			}
		</div>
	`,
	styles: `
		:host {
			@apply grid h-svh min-w-0 grid-rows-[64px_1fr_64px] overflow-hidden transition-[width] duration-200;

			.brand-container {
				@apply p-2;
			}

			.nav-container {
				@apply flex flex-col gap-2 overflow-y-auto;
			}

			.footer {
				@apply border-border flex items-center justify-between border-t;
			}
		}

		:host(.collapsed) {
			.brand-container {
				@apply border-border border-b;
			}

			.nav-container {
				@apply py-2;
			}

			.footer {
				@apply flex justify-center px-2;
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
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
	private readonly authStore = inject(AuthStore)
	private readonly navigation = inject(Navigation)
	private readonly router = inject(Router)
	private readonly platformId = inject(PLATFORM_ID)
	protected readonly uiStore = inject(UIStore)
	protected readonly sections = computed(() => this.navigation.sections())

	protected readonly isLgViewport = this.createLgViewportSignal()
	protected readonly isCollapsed = computed(() => this.isLgViewport() && this.uiStore.isSidebarCollapsed())

	private readonly logoutNavigationEffect = effect(() => {
		const user = this.authStore.currentUser()
		const isLoggingOut = this.authStore.isLoggingOut()

		if (!user && !isLoggingOut) {
			this.router.navigate(['/auth/login'])
		}
	})

	protected onCollapseShortcut(event: Event): void {
		event.preventDefault()
		if (!this.isLgViewport()) return
		this.toggleCollapse()
	}

	protected onEscape(): void {
		if (this.uiStore.isSidebarOpen()) {
			this.uiStore.setSidebarOpen(false)
		}
	}

	protected toggleCollapse(): void {
		this.uiStore.setSidebarCollapsed(!this.uiStore.isSidebarCollapsed())
	}

	protected logout(): void {
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
