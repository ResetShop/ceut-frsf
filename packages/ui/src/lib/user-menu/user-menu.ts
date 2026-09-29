import { Component, input } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherMoreVertical } from '@ng-icons/feather-icons'
import { type NgpMenuPlacement, NgpMenuTrigger } from 'ng-primitives/menu'
import { Avatar } from '../avatar/avatar'
import { Menu, MenuHeader, type MenuItem } from '../menu/menu'
import { type MenuItemsInput } from '../menu/menu-groups'

/**
 * A tile identifying the signed-in user that opens a `Menu` of user-scoped items.
 *
 * Expanded, the trigger shows the avatar, name and email. Collapsed, it shows the avatar only and
 * the menu is unchanged — its header, repeating the avatar, name and email, is then the only place
 * the user's identity is visible, so it is always rendered. Items behave as in `Menu`: links, actions
 * and nested menus, flat or grouped.
 *
 * The trigger's accessible name is the user's name in both states, so screen readers announce who
 * is signed in whether or not the name is visible.
 *
 * @example
 *   <app-user-menu name="Ada Lovelace" email="ada@example.com" initials="AL" [items]="items" />
 */
@Component({
	selector: 'app-user-menu',
	standalone: true,
	imports: [Avatar, Menu, MenuHeader, NgIcon, NgpMenuTrigger],
	viewProviders: [provideIcons({ featherMoreVertical })],
	template: `
		<button
			[ngpMenuTrigger]="menu"
			[ngpMenuTriggerPlacement]="placement()"
			[attr.aria-label]="name()"
			[class.justify-center]="collapsed()"
			type="button"
			class="hover:bg-accent data-[open]:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
		>
			<app-avatar [initials]="initials()" />
			@if (!collapsed()) {
				<span class="grid min-w-0 flex-1 leading-tight">
					<span class="text-foreground truncate font-medium">{{ name() }}</span>
					<span class="text-muted-foreground truncate text-xs">{{ email() }}</span>
				</span>
				<ng-icon
					name="featherMoreVertical"
					aria-hidden="true"
					data-testid="menu-indicator"
					class="text-muted-foreground size-4 shrink-0"
				/>
			}
		</button>

		<ng-template #menu>
			<app-menu [items]="items()" class="min-w-56">
				<div appMenuHeader class="flex items-center gap-2 px-3 py-2 text-sm">
					<app-avatar [initials]="initials()" />
					<span class="grid min-w-0 flex-1 leading-tight">
						<span class="truncate font-medium">{{ name() }}</span>
						<span class="text-muted-foreground truncate text-xs">{{ email() }}</span>
					</span>
				</div>
			</app-menu>
		</ng-template>
	`,
})
export class UserMenu {
	public readonly name = input.required<string>()
	public readonly email = input.required<string>()
	public readonly initials = input.required<string>()
	public readonly items = input.required<MenuItemsInput<MenuItem>>()

	/** Shows the avatar only, for a sidebar collapsed to icons. */
	public readonly collapsed = input(false)

	/**
	 * Where the menu opens relative to the trigger. The default suits a trigger pinned to the bottom
	 * of a sidebar; the menu still flips when there is no room.
	 */
	public readonly placement = input<NgpMenuPlacement>('right-end')
}
