import { Component, computed, input } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherMoreVertical } from '@ng-icons/feather-icons'
import { NgpMenuTrigger } from 'ng-primitives/menu'
import { Button } from '../button/button'
import { Menu, type MenuAction } from '../menu/menu'
import { toMenuGroups, type MenuItemsInput } from '../menu/menu-groups'

/**
 * A single action exposed in a row-actions menu. Row menus act on their row in place, so they take
 * `Menu`'s action items only — not links or nested menus.
 */
export type RowAction = MenuAction

/**
 * Input shape for `RowActionsMenu.actions`: a flat list of actions, or groups with a separator
 * between every pair of non-empty groups. Empty groups are skipped, so consumers can build groups
 * conditionally without producing dangling separators.
 */
export type RowActionsInput = MenuItemsInput<RowAction>

/**
 * Vertical-ellipsis (⋮) trigger that opens a `Menu` listing the row's actions.
 *
 * Renders nothing when no group contains actions — consumers do not need to guard with `@if`.
 * The menu opens `bottom-start` and flips near viewport edges; keyboard handling, separators and
 * item styling are `Menu`'s.
 *
 * @example
 *   <!-- Flat list — single group, no separators -->
 *   <app-row-actions-menu [actions]="[edit, resetPassword, delete]" />
 *
 *   <!-- Groups — separator between non-destructive and destructive -->
 *   <app-row-actions-menu [actions]="[[edit, resetPassword], [delete]]" />
 */
@Component({
	selector: 'app-row-actions-menu',
	standalone: true,
	imports: [Button, Menu, NgIcon, NgpMenuTrigger],
	viewProviders: [provideIcons({ featherMoreVertical })],
	template: `
		@if (hasActions()) {
			<button
				[ngpMenuTrigger]="menu"
				[attr.aria-label]="triggerLabel()"
				appButton
				variant="ghost"
				size="icon"
				type="button"
				data-touch-target
			>
				<ng-icon data-icon="start" name="featherMoreVertical" />
			</button>

			<ng-template #menu>
				<app-menu [items]="actions()" data-testid="row-actions-menu" class="min-w-[8rem]" />
			</ng-template>
		}
	`,
})
export class RowActionsMenu {
	public readonly actions = input.required<RowActionsInput>()
	public readonly triggerLabel = input<string>('Actions')

	protected readonly hasActions = computed(() => toMenuGroups(this.actions()).length > 0)
}
