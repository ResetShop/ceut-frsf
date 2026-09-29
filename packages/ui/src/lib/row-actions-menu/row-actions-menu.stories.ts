import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherEdit3, featherKey, featherTrash2 } from '@ng-icons/feather-icons'
import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { type RowAction, RowActionsMenu } from './row-actions-menu'

const noop = () => () => undefined

// Plain DOM (not `@testing-library/*`) because Storybook's lint rule forbids those imports in story files.
function openMenu(canvasElement: HTMLElement): void {
	// Depends on the default `triggerLabel` value ("Actions"). If a story overrides `triggerLabel`,
	// this helper needs to know the override or the click silently no-ops.
	const trigger = canvasElement.querySelector<HTMLButtonElement>('button[aria-label="Actions"]')
	trigger?.click()
}

const meta: Meta<RowActionsMenu> = {
	component: RowActionsMenu,
	title: 'Components/RowActionsMenu',
	tags: ['autodocs'],
	decorators: [
		moduleMetadata({
			imports: [NgIcon],
			providers: [provideIcons({ featherEdit3, featherKey, featherTrash2 })],
		}),
	],
	argTypes: {
		actions: {
			control: 'object',
			description:
				'Actions to render. Accepts a flat `RowAction[]` (no separators) or a matrix `RowAction[][]` (one group per inner array; a `role="separator"` divider is rendered between every pair of non-empty groups).',
			table: {
				type: { summary: 'RowAction[] | RowAction[][]' },
				defaultValue: { summary: '[]' },
			},
		},
		triggerLabel: {
			control: 'text',
			description:
				'Accessible name for the trigger button — announced by screen readers. Apps pass a translated label.',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: "'Actions'" },
			},
		},
	},
	parameters: {
		docs: {
			description: {
				component: `
A vertical-ellipsis (⋮) trigger that opens a popover menu with row-scoped actions.

## Behavior

- Renders nothing when no group contains actions (consumers do not need to guard).
- The popover is a \`Menu\`, so it shares its keyboard handling (arrow keys navigate, Enter/Space
  activates, Escape closes, focus returns to the trigger on keyboard close) and its theme-token styling.
- Menu opens \`bottom-start\` relative to the trigger and flips near viewport edges.
- Clicking a menu item invokes its \`onSelect\` callback and closes the menu.
- Destructive items (\`variant: 'destructive'\`) render in \`text-destructive\`.
- Grouped form: pass \`actions\` as a matrix to render separators between groups; empty groups
  are dropped automatically so consumers can build groups conditionally without producing
  dangling separators.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<RowActionsMenu>

const sampleActions: RowAction[] = [
	{ label: 'Edit', onSelect: noop() },
	{ label: 'Reset password', onSelect: noop() },
	{ label: 'Delete', onSelect: noop(), variant: 'destructive' },
]

/**
 * The default menu with three actions including a destructive Delete item. Click the ⋮ trigger to open.
 */
export const Default: Story = {
	args: {
		actions: sampleActions,
	},
}

/**
 * The same three actions, but the play function auto-opens the menu so the static canvas
 * shows the popover contents for visual review without requiring interaction.
 */
export const Open: Story = {
	args: {
		actions: sampleActions,
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/**
 * Each action carries an `icon` field, rendered before the label inside the menu item.
 */
export const WithIcons: Story = {
	args: {
		actions: [
			{ label: 'Edit', onSelect: noop(), icon: 'featherEdit3' },
			{ label: 'Reset password', onSelect: noop(), icon: 'featherKey' },
			{ label: 'Delete', onSelect: noop(), variant: 'destructive', icon: 'featherTrash2' },
		],
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/**
 * A single-action menu renders as a menu (not collapsed to a bare button). Consistent UX
 * with multi-action cases — predictable affordance regardless of action count.
 */
export const SingleAction: Story = {
	args: {
		actions: [{ label: 'Edit', onSelect: noop() }],
	},
}

/**
 * Edge case: when `actions` is empty the component renders nothing at all. The actions cell
 * remains empty so callers do not need to guard their `<app-row-actions-menu>` invocations
 * with their own `@if`.
 */
export const EmptyActions: Story = {
	args: {
		actions: [],
	},
}

/**
 * Grouped actions — pass `actions` as a matrix and the component renders a separator
 * between non-empty groups. Visually splits non-destructive actions (Edit, Reset password)
 * from destructive ones (Delete).
 */
export const Grouped: Story = {
	args: {
		actions: [
			[
				{ label: 'Edit', onSelect: noop(), icon: 'featherEdit3' },
				{ label: 'Reset password', onSelect: noop(), icon: 'featherKey' },
			],
			[{ label: 'Delete', onSelect: noop(), variant: 'destructive', icon: 'featherTrash2' }],
		],
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/**
 * A disabled item inside an open menu — `disabled: true` renders the item dimmed and
 * non-interactive while still occupying a menuitem slot. Auto-opens via `play()` so the
 * disabled rendering is visible in the static canvas.
 */
export const WithDisabledItem: Story = {
	args: {
		actions: [
			{ label: 'Edit', onSelect: noop(), icon: 'featherEdit3' },
			{ label: 'Reset password', onSelect: noop(), icon: 'featherKey', disabled: true },
			{ label: 'Delete', onSelect: noop(), variant: 'destructive', icon: 'featherTrash2' },
		],
	},
	play: ({ canvasElement }) => openMenu(canvasElement),
}

/**
 * The open menu in dark mode. The panel and its items take their colors from the theme tokens, so
 * they follow the dark theme without dark-specific classes.
 */
export const OpenDark: Story = {
	args: {
		actions: [
			[
				{ label: 'Edit', onSelect: noop(), icon: 'featherEdit3' },
				{ label: 'Reset password', onSelect: noop(), icon: 'featherKey' },
			],
			[{ label: 'Delete', onSelect: noop(), variant: 'destructive', icon: 'featherTrash2' }],
		],
	},
	globals: { backgrounds: { value: 'dark' } },
	play: ({ canvasElement }) => openMenu(canvasElement),
}
