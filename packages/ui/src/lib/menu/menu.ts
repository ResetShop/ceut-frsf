import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, contentChild, Directive, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronRight } from '@ng-icons/feather-icons'
import { NgpMenu, NgpMenuItem, NgpSubmenuTrigger } from 'ng-primitives/menu'
import { NgpSeparator } from 'ng-primitives/separator'
import { type MenuItemsInput, toMenuGroups } from './menu-groups'

interface MenuItemBase {
	readonly label: string
	/** An `@ng-icons` name, provided by the consumer, rendered before the label. */
	readonly icon?: string
	readonly disabled?: boolean
}

/** An item that takes the user to a page: rendered as a link to `route`. */
export interface MenuLink extends MenuItemBase {
	readonly route: string
	readonly onSelect?: never
	readonly items?: never
}

/** An item that acts in place, without a page of its own: rendered as a button. */
export interface MenuAction extends MenuItemBase {
	readonly onSelect: () => void
	/** `'destructive'` renders the label in the destructive color. */
	readonly variant?: 'default' | 'destructive'
	readonly route?: never
	readonly items?: never
}

/** An item that opens a nested menu of its own `items`. */
export interface MenuSubmenu extends MenuItemBase {
	readonly items: MenuItemsInput<MenuItem>
	readonly route?: never
	readonly onSelect?: never
}

export type MenuItem = MenuLink | MenuAction | MenuSubmenu

/**
 * Marks projected content to render at the top of a `Menu`, above its items and separated from them.
 * It is not a menu item, so it is skipped by keyboard navigation.
 */
@Directive({
	selector: '[appMenuHeader]',
	standalone: true,
})
export class MenuHeader {}

/**
 * The panel of a popover menu: its items, separated into groups, and an optional header.
 *
 * Render it inside the template a menu trigger opens (`[ngpMenuTrigger]`): the component is itself the
 * `ngpMenu`, so it gets the primitive's keyboard navigation, focus handling and positioning. Items
 * that lead to a page are links, so they keep what links give users (the URL, opening in a new tab,
 * being announced as links); items that act in place are buttons; items with `items` of their own open
 * a nested menu, to any depth.
 *
 * Arrow keys move between items and into or out of nested menus, Enter activates, and Escape closes.
 * Selecting a link or an action closes every open menu.
 *
 * @example
 *   <button [ngpMenuTrigger]="menu">Open</button>
 *   <ng-template #menu>
 *     <app-menu [items]="[[account, settings], [logOut]]">
 *       <div appMenuHeader>Signed in as Ada</div>
 *     </app-menu>
 *   </ng-template>
 */
@Component({
	selector: 'app-menu',
	standalone: true,
	imports: [NgIcon, NgpMenuItem, NgpSeparator, NgpSubmenuTrigger, NgTemplateOutlet, RouterLink],
	hostDirectives: [NgpMenu],
	viewProviders: [provideIcons({ featherChevronRight })],
	host: {
		role: 'menu',
		// "fixed" is required: the primitive positions the menu through style.left / style.top, which
		// have no effect on a statically positioned element. There is no minimum width here, so a consumer
		// can set one through the host's class without competing with it.
		class:
			'bg-card text-card-foreground border-border fixed z-50 flex w-max max-w-72 flex-col overflow-hidden rounded-md border shadow-md',
	},
	template: `
		<ng-template #itemContent let-item>
			@if (item.icon; as icon) {
				<ng-icon [name]="icon" aria-hidden="true" data-testid="menu-item-icon" class="size-4 shrink-0" />
			}
			{{ item.label }}
		</ng-template>

		<ng-content select="[appMenuHeader]" />
		@for (group of groups(); track $index; let first = $first) {
			@if (header() || !first) {
				<div ngpSeparator role="separator" class="bg-border my-1 h-px"></div>
			}
			@for (item of group; track $index) {
				@if (item.route !== undefined) {
					<!-- A disabled link drops its URL: an anchor cannot be disabled natively. -->
					<a
						[routerLink]="item.disabled ? null : item.route"
						[attr.aria-disabled]="item.disabled || null"
						[ngpMenuItemDisabled]="!!item.disabled"
						[class]="itemClasses"
						class="text-foreground"
						ngpMenuItem
						role="menuitem"
					>
						<ng-container *ngTemplateOutlet="itemContent; context: { $implicit: item }" />
					</a>
				} @else if (item.items !== undefined) {
					<button
						[ngpSubmenuTrigger]="submenu"
						[ngpSubmenuTriggerDisabled]="!!item.disabled"
						[ngpMenuItemDisabled]="!!item.disabled"
						[disabled]="!!item.disabled"
						[class]="itemClasses"
						class="text-foreground"
						ngpMenuItem
						role="menuitem"
						type="button"
					>
						<ng-container *ngTemplateOutlet="itemContent; context: { $implicit: item }" />
						<ng-icon
							name="featherChevronRight"
							aria-hidden="true"
							data-testid="submenu-indicator"
							class="text-muted-foreground ms-auto size-4 shrink-0"
						/>
					</button>
					<ng-template #submenu>
						<app-menu [items]="item.items" />
					</ng-template>
				} @else {
					<button
						(click)="item.onSelect()"
						[disabled]="!!item.disabled"
						[ngpMenuItemDisabled]="!!item.disabled"
						[class]="itemClasses"
						[class.text-destructive]="item.variant === 'destructive'"
						[class.text-foreground]="item.variant !== 'destructive'"
						ngpMenuItem
						role="menuitem"
						type="button"
					>
						<ng-container *ngTemplateOutlet="itemContent; context: { $implicit: item }" />
					</button>
				}
			}
		}
	`,
})
export class Menu {
	/** A flat list of items, or groups with a separator between each pair. Empty groups are dropped. */
	public readonly items = input.required<MenuItemsInput<MenuItem>>()

	protected readonly header = contentChild(MenuHeader)
	protected readonly groups = computed(() => toMenuGroups(this.items()))

	// Shared by every item kind. The text color is applied per item instead of here, because a base
	// color class would compete with `text-destructive` at equal specificity.
	protected readonly itemClasses =
		'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm no-underline transition-colors hover:bg-accent focus:outline-none data-[focus-visible]:bg-accent data-[open]:bg-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'
}
