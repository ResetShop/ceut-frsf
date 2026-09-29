import { Component } from '@angular/core'
import { provideRouter } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import {
	featherBell,
	featherCreditCard,
	featherLogOut,
	featherMonitor,
	featherMoon,
	featherSettings,
	featherSun,
	featherUser,
} from '@ng-icons/feather-icons'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, componentWrapperDecorator, moduleMetadata } from '@storybook/angular'
import { type MenuItem } from '../menu/menu'
import { UserMenu } from './user-menu'

// Link items need a router to resolve their URLs; a blank catch-all keeps the story in place on click.
@Component({ template: '' })
class StoryPage {}

// Pages are links; Log out acts in place, so it is the one button.
const pageLinks: MenuItem[] = [
	{ label: 'Account', icon: 'featherUser', route: '/account' },
	{ label: 'Billing', icon: 'featherCreditCard', route: '/billing' },
	{ label: 'Notifications', icon: 'featherBell', route: '/notifications' },
	{ label: 'Settings', icon: 'featherSettings', route: '/settings' },
]
const sessionActions: MenuItem[] = [{ label: 'Log out', icon: 'featherLogOut', onSelect: () => undefined }]

// Plain DOM (not `@testing-library/*`) because Storybook's lint rule forbids those imports in story files.
async function openMenu(canvasElement: HTMLElement, ...submenuLabels: string[]): Promise<void> {
	canvasElement.querySelector<HTMLButtonElement>('button')?.click()
	for (const label of submenuLabels) {
		// Menus render into an overlay outside the canvas, one frame after the click that opens them.
		await new Promise((resolve) => setTimeout(resolve, 50))
		const items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
		items.find((item) => item.textContent?.trim() === label)?.click()
	}
}

// Pins the tile to the bottom of a sidebar-shaped column, with room beside and above it for the
// menu, which opens to the right and grows upwards from the trigger's bottom edge.
function sidebarFooter(width: string) {
	return componentWrapperDecorator(
		(story) => `
			<div class="flex h-96 items-end">
				<div class="border-border bg-background ${width} border-t border-r p-2">${story}</div>
			</div>
		`,
	)
}

const meta: Meta<UserMenu> = {
	component: UserMenu,
	title: 'Components/UserMenu',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([{ path: '**', component: StoryPage }])],
		}),
		moduleMetadata({
			imports: [NgIcon],
			providers: [
				provideIcons({
					featherUser,
					featherCreditCard,
					featherBell,
					featherSettings,
					featherLogOut,
					featherSun,
					featherMoon,
					featherMonitor,
				}),
			],
		}),
	],
	args: {
		name: 'Ada Lovelace',
		email: 'ada@example.com',
		initials: 'AL',
		items: [pageLinks, sessionActions],
		collapsed: false,
		placement: 'right-end',
	},
	argTypes: {
		name: {
			control: 'text',
			description: 'The signed-in user’s full name. Also the trigger’s accessible name, in both states.',
			table: { type: { summary: 'string' } },
		},
		email: {
			control: 'text',
			description: 'The signed-in user’s email.',
			table: { type: { summary: 'string' } },
		},
		initials: {
			control: 'text',
			description: 'Shown in the avatar. The caller derives them from the name.',
			table: { type: { summary: 'string' } },
		},
		items: {
			control: 'object',
			description:
				'A flat `MenuItem[]`, or `MenuItem[][]` groups with a separator between each pair. An item with a `route` renders as a link, one with `onSelect` as a button, and one with `items` opens a nested menu. Empty groups are dropped.',
			table: { type: { summary: 'MenuItem[] | MenuItem[][]' } },
		},
		collapsed: {
			control: 'boolean',
			description: 'Avatar-only trigger, for a sidebar collapsed to icons. The menu is unchanged.',
			table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
		},
		placement: {
			control: 'select',
			options: ['right-end', 'right-start', 'top', 'top-start', 'top-end', 'bottom-start'],
			description: 'Where the menu opens relative to the trigger. It still flips when there is no room.',
			table: { type: { summary: 'NgpMenuPlacement' }, defaultValue: { summary: "'right-end'" } },
		},
	},
	parameters: {
		docs: {
			description: {
				component: `
A tile identifying the signed-in user, pinned to the bottom of a sidebar, that opens a menu of
user-scoped items.

## Behavior

- **Expanded:** avatar, name, email and a ⋮ affordance. **Collapsed:** avatar only.
- The menu always starts with a non-interactive header repeating the avatar, name and email —
  when the sidebar is collapsed it is the only place the user's identity is visible.
- The trigger's accessible name is the user's name in both states.
- The menu is a \`Menu\`: **links** (\`route\`) lead to a page and carry a real URL, **actions**
  (\`onSelect\`) act in place, such as Log out, and **nested menus** (\`items\`) open a menu of their
  own. See the Menu stories for every item behavior.
- Built on \`ng-primitives\` \`NgpMenu\`: arrow keys move between items, Enter activates,
  Escape closes and returns focus to the trigger; clicking outside closes it.
- Opens to the right of the trigger by default (\`placement\`), flipping when there is no room.
- Labels arrive already translated.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta
type Story = StoryObj<UserMenu>

export const Expanded: Story = {
	decorators: [sidebarFooter('w-64')],
}

/** Expanded, with the menu open. */
export const ExpandedOpen: Story = {
	decorators: [sidebarFooter('w-64')],
	play: ({ canvasElement }) => openMenu(canvasElement),
}

export const Collapsed: Story = {
	args: { collapsed: true },
	decorators: [sidebarFooter('w-16')],
}

/** Collapsed, with the menu open: the header is the only place the user's name and email show. */
export const CollapsedOpen: Story = {
	args: { collapsed: true },
	decorators: [sidebarFooter('w-16')],
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** Long names and emails truncate in the trigger and in the menu header instead of wrapping. */
export const LongNameAndEmail: Story = {
	args: {
		name: 'Augusta Ada King, Countess of Lovelace',
		email: 'augusta.ada.king.countess.of.lovelace@analytical-engine.example.com',
	},
	decorators: [sidebarFooter('w-64')],
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** A disabled link (no URL, dimmed) next to available ones, and a destructive action. */
export const DisabledAndDestructiveItems: Story = {
	args: {
		items: [
			[
				{ label: 'Account', icon: 'featherUser', route: '/account' },
				{ label: 'Billing', icon: 'featherCreditCard', route: '/billing', disabled: true },
			],
			[{ label: 'Delete account', onSelect: () => undefined, variant: 'destructive' }],
		],
	},
	decorators: [sidebarFooter('w-64')],
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** Opening upwards, for a trigger at the bottom of a narrow mobile drawer. */
export const OpensUpwards: Story = {
	args: { placement: 'top' },
	decorators: [sidebarFooter('w-64')],
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** A nested menu inside the user menu: Theme opens its own menu of choices. */
export const WithNestedMenu: Story = {
	args: {
		items: [
			pageLinks,
			[
				{
					label: 'Theme',
					icon: 'featherSun',
					items: [
						{ label: 'Light', icon: 'featherSun', onSelect: () => undefined },
						{ label: 'Dark', icon: 'featherMoon', onSelect: () => undefined },
						{ label: 'System', icon: 'featherMonitor', onSelect: () => undefined },
					],
				},
			],
			sessionActions,
		],
	},
	decorators: [sidebarFooter('w-64')],
	play: ({ canvasElement }) => openMenu(canvasElement, 'Theme'),
}
