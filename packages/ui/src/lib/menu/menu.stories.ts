import { Component } from '@angular/core'
import { provideRouter } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import {
	featherBookOpen,
	featherHelpCircle,
	featherLogOut,
	featherMonitor,
	featherMoon,
	featherSettings,
	featherSliders,
	featherSun,
	featherTrash2,
	featherUser,
} from '@ng-icons/feather-icons'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { NgpMenuTrigger } from 'ng-primitives/menu'
import { Button } from '../button/button'
import { Menu, MenuHeader, type MenuItem } from './menu'

// Link items need a router to resolve their URLs; a blank catch-all keeps the story in place on click.
@Component({ template: '' })
class StoryPage {}

const noop = () => undefined

const account: MenuItem = { label: 'Account', icon: 'featherUser', route: '/account' }
const settings: MenuItem = { label: 'Settings', icon: 'featherSettings', route: '/settings' }
const logOut: MenuItem = { label: 'Log out', icon: 'featherLogOut', onSelect: noop }
const theme: MenuItem = {
	label: 'Theme',
	icon: 'featherSun',
	items: [
		{ label: 'Light', icon: 'featherSun', onSelect: noop },
		{ label: 'Dark', icon: 'featherMoon', onSelect: noop },
		{ label: 'System', icon: 'featherMonitor', onSelect: noop },
	],
}

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

const trigger = `<button [ngpMenuTrigger]="menu" appButton variant="outline" type="button">Open menu</button>`

const meta: Meta<Menu> = {
	component: Menu,
	title: 'Components/Menu',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideRouter([{ path: '**', component: StoryPage }])],
		}),
		moduleMetadata({
			imports: [Button, Menu, MenuHeader, NgIcon, NgpMenuTrigger],
			providers: [
				provideIcons({
					featherBookOpen,
					featherHelpCircle,
					featherLogOut,
					featherMonitor,
					featherMoon,
					featherSettings,
					featherSliders,
					featherSun,
					featherTrash2,
					featherUser,
				}),
			],
		}),
	],
	render: (args) => ({
		props: args,
		template: `${trigger}<ng-template #menu><app-menu [items]="items" /></ng-template>`,
	}),
	argTypes: {
		items: {
			control: 'object',
			description:
				'A flat `MenuItem[]`, or `MenuItem[][]` groups with a separator between each pair. An item with a `route` renders as a link, one with `onSelect` as a button, and one with `items` opens a nested menu. Empty groups are dropped.',
			table: { type: { summary: 'MenuItem[] | MenuItem[][]' } },
		},
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: `
The panel of a popover menu. Render it inside the template a menu trigger opens
(\`[ngpMenuTrigger]\`); the component is itself the \`ngpMenu\`.

## Items

- **Links** (\`route\`) lead to a page: they carry a real URL, so they can be opened in a new tab or
  copied, and are announced as links. A disabled link drops its URL and is marked \`aria-disabled\`.
- **Actions** (\`onSelect\`) act in place and render as buttons; \`variant: 'destructive'\` colors them.
- **Nested menus** (\`items\`) open a menu of their own, to any depth, marked with a chevron.

Pass items flat, or as groups with a separator between each pair. Project an element marked
\`appMenuHeader\` to show content above the items; it is not a menu item.

## Behavior

- Arrow keys move between items; the right arrow opens a nested menu and the left arrow closes it.
- Enter activates; Escape closes the innermost open menu; selecting a link or an action closes all.
- With a mouse, hovering over a nested menu's item opens it; a tap or the keyboard opens it too.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta
type Story = StoryObj<Menu>

export const Default: Story = {
	args: { items: [account, settings, logOut] },
}

/** A flat list, open: one group, so no separators. */
export const Open: Story = {
	args: { items: [account, settings, logOut] },
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** Links and actions in separate groups, divided by a separator. */
export const Grouped: Story = {
	args: {
		items: [[account, settings], [{ label: 'Documentation', icon: 'featherBookOpen', route: '/docs' }], [logOut]],
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** Content projected with `appMenuHeader` sits above the items and is not a menu item. */
export const WithHeader: Story = {
	args: { items: [[account, settings], [logOut]] },
	render: (args) => ({
		props: args,
		template: `${trigger}
			<ng-template #menu>
				<app-menu [items]="items">
					<div appMenuHeader class="text-muted-foreground px-3 py-2 text-xs">Signed in as ada@example.com</div>
				</app-menu>
			</ng-template>`,
	}),
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/** An item with `items` of its own opens a nested menu, here opened to show it. */
export const WithNestedMenu: Story = {
	args: { items: [[account, settings], [theme], [logOut]] },
	play: ({ canvasElement }) => openMenu(canvasElement, 'Theme'),
}

/** Nested menus go to any depth. */
export const NestedTwoLevels: Story = {
	args: {
		items: [
			[account],
			[
				{
					label: 'Preferences',
					icon: 'featherSliders',
					items: [theme, { label: 'Help', icon: 'featherHelpCircle', route: '/help' }],
				},
			],
			[logOut],
		],
	},
	play: ({ canvasElement }) => openMenu(canvasElement, 'Preferences', 'Theme'),
}

/** A disabled link (no URL, dimmed), a disabled nested menu, and a destructive action. */
export const DisabledAndDestructiveItems: Story = {
	args: {
		items: [
			[account, { label: 'Billing', route: '/billing', disabled: true }],
			[{ ...theme, disabled: true }],
			[{ label: 'Delete account', icon: 'featherTrash2', onSelect: noop, variant: 'destructive' }],
		],
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}
