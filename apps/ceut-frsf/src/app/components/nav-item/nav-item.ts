import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core'
import { Router, RouterLink, RouterLinkActive } from '@angular/router'
import { NgIcon } from '@ng-icons/core'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { isParentRoute, type NavigationRoute } from '@resetshop/angular-core/interfaces/navigation'
import { NavigationState } from '@resetshop/angular-core/navigation/navigation-state'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appNavItem]',
	imports: [NgIcon, RouterLink, RouterLinkActive, TranslatePipe],
	host: { class: 'cursor-pointer text-sm', '[class.collapsed]': 'collapsed()' },
	styles: `
		:host(.collapsed) {
			@apply flex h-12 items-center justify-center;
		}

		.nav-children {
			max-height: 0;
			overflow: hidden;
			opacity: 0;
			transition:
				max-height var(--transition-duration, 200ms) ease-out,
				opacity var(--transition-duration, 200ms) ease-out;
		}

		.nav-children[data-expanded] {
			max-height: 100vh;
			opacity: 1;
		}

		@media (prefers-reduced-motion: reduce) {
			.nav-children,
			.rotate-90 {
				transition-duration: 0.01ms;
			}
		}
	`,
	template: `
		@if (hasChildren() && !collapsed()) {
			<!-- Parent item with expand button -->
			<div class="nav-item-container">
				<button
					(click)="toggleExpanded()"
					(keydown.enter)="$event.preventDefault(); toggleExpanded()"
					(keydown.space)="$event.preventDefault(); toggleExpanded()"
					[attr.aria-expanded]="isExpanded()"
					[attr.aria-controls]="'nav-children-' + item().id"
					[class.p-2]="!collapsed()"
					class="text-foreground hover:bg-accent/50 hover:text-accent-foreground flex w-full items-center gap-2 rounded-md text-left"
				>
					@if (iconName(); as iconName) {
						<ng-icon [name]="iconName" data-testid="item-icon" />
					}
					<span class="truncate">{{ item().name | translate }}</span>
					<ng-icon
						[class.rotate-90]="isExpanded()"
						name="featherChevronRight"
						class="ml-auto transition-transform duration-200"
						aria-hidden="true"
						data-testid="chevron-icon"
					/>
				</button>

				<!-- Children container -->
				<ul
					[id]="'nav-children-' + item().id"
					[attr.aria-hidden]="!isExpanded()"
					[attr.data-expanded]="isExpanded() || null"
					[style.--transition-duration.ms]="transitionDuration()"
					class="nav-children"
				>
					@for (child of children(); track child.id) {
						<li [item]="child" appNavItem class="pl-6"></li>
					}
				</ul>
			</div>
		} @else {
			<!-- Leaf item (or collapsed parent) -->
			<a
				[routerLink]="item().route"
				[routerLinkActiveOptions]="{ exact: false }"
				[attr.aria-label]="collapsed() ? item().name : null"
				[attr.title]="collapsed() ? item().name : null"
				[class.h-12]="collapsed()"
				[class.w-12]="collapsed()"
				[class.p-2]="!collapsed()"
				[class.justify-center]="collapsed()"
				routerLinkActive="bg-accent text-accent-foreground font-medium"
				class="text-foreground hover:bg-accent/50 hover:text-accent-foreground flex items-center gap-2 rounded-lg"
			>
				@if (iconName(); as iconName) {
					<ng-icon
						[name]="iconName"
						[class.m-2]="collapsed()"
						[size]="collapsed() ? '28' : '16'"
						data-testid="item-icon"
					/>
				}
				@if (!collapsed()) {
					<span class="truncate">{{ item().name | translate }}</span>
				}
			</a>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NavItem {
	public readonly item = input.required<NavigationRoute>()
	public readonly collapsed = input(false)

	/**
	 * Transition duration in milliseconds for expand/collapse animations.
	 * @default 200
	 */
	public readonly transitionDuration = input<number>(200)

	private readonly router = inject(Router)
	private readonly navState = inject(NavigationState)

	/**
	 * Determines if this navigation item has child routes.
	 * @returns True if the item has at least one child route
	 */
	protected readonly hasChildren = computed(() => isParentRoute(this.item()))

	/**
	 * Returns the children navigation routes for parent routes
	 * @returns An array of NavigationRoute, which can be empty
	 */
	protected readonly children = computed((): NavigationRoute[] => {
		const route = this.item()
		if (isParentRoute(route)) {
			return route.children
		}
		return []
	})

	/**
	 * Checks if this navigation item is currently expanded.
	 * Always returns false for leaf items (items without children).
	 * @returns True if expanded, false if collapsed or has no children
	 */
	protected readonly isExpanded = computed(() => this.navState.isExpanded(this.item().id))

	/**
	 * Extracts the icon name from the navigation route's icon object.
	 * @returns The icon name as a string, or null if no icon is provided
	 */
	protected readonly iconName = computed(() => {
		const icon = this.item().icon
		return icon ? Object.keys(icon)[0] : null // Get the key name
	})

	// Auto-expand when child route is active
	private readonly autoExpandEffect = effect(
		() => {
			const item = this.item()
			if (!isParentRoute(item)) return

			const hasActiveChild = item.children.some((child) =>
				this.router.isActive(child.route, {
					paths: 'subset',
					queryParams: 'ignored',
					fragment: 'ignored',
					matrixParams: 'ignored',
				}),
			)

			if (hasActiveChild && !this.isExpanded()) {
				this.navState.expand(item.id)
			}
		},
		{ manualCleanup: false },
	)

	/**
	 * Toggles the expanded state of this navigation item.
	 * Only applicable to parent items with children. For leaf items, this method has no effect.
	 * The expansion state is managed by the NavigationStateService at the sidebar level.
	 */
	protected toggleExpanded(): void {
		this.navState.toggle(this.item().id)
	}
}
