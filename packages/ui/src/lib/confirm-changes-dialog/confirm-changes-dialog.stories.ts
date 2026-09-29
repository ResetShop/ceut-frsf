import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { Button } from '../button/button'
import { ConfirmChangesDialog, type ConfirmChangesEntry } from './confirm-changes-dialog'

const meta: Meta<ConfirmChangesDialog> = {
	component: ConfirmChangesDialog,
	title: 'Components/ConfirmChangesDialog',
	tags: ['autodocs'],
	decorators: [
		moduleMetadata({
			imports: [ConfirmChangesDialog, Button],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: `
A confirmation dialog that lists pending changes as **before → after** rows and asks the user to
confirm them before they are persisted. It composes \`ConfirmDialog\`, so it shares its native
\`<dialog>\` behavior, stacking, ESC-to-cancel, and animation.

## Features

- **Diff rows**: one \`<dt>\`/\`<dd>\` pair per changed field, previous value struck through
- **Accessible**: screen-reader "Before:" / "After:" prefixes (configurable via \`beforeLabel\` / \`afterLabel\`)
- **Caller owns translation**: all text arrives through inputs, already resolved by the caller — including each row's \`label\`, \`before\` and \`after\`. The defaults are English, so an omitted input renders English instead of failing loudly.
- **Imperative API**: \`dialog.show()\` / \`dialog.close()\` via template ref

## Usage

\`\`\`html
<app-confirm-changes-dialog #dialog
  [title]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.TITLE' | translate"
  [message]="confirmMessage()"
  [changes]="changes()"
  [beforeLabel]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.BEFORE' | translate"
  [afterLabel]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.AFTER' | translate"
  [confirmText]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.CONFIRM' | translate"
  [cancelText]="'COMMON.CANCEL' | translate"
  (confirmed)="onSave()"
/>
\`\`\`

Row labels and values are translated by the host too — resolve them when building the
\`ConfirmChangesEntry[]\`, including any placeholder for an empty value.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
	argTypes: {
		title: {
			control: 'text',
			description: 'Dialog title',
			table: { defaultValue: { summary: 'Confirm changes' } },
		},
		message: {
			control: 'text',
			description: 'Short explanation rendered above the change list',
		},
		changes: {
			control: 'object',
			description: 'The changes to review: `{ label, before, after }[]`',
		},
		beforeLabel: {
			control: 'text',
			description: 'Screen-reader prefix for the previous value',
			table: { defaultValue: { summary: 'Before' } },
		},
		afterLabel: {
			control: 'text',
			description: 'Screen-reader prefix for the new value',
			table: { defaultValue: { summary: 'After' } },
		},
		confirmText: {
			control: 'text',
			description: 'Text for the confirm button',
			table: { defaultValue: { summary: 'Confirm' } },
		},
		cancelText: {
			control: 'text',
			description: 'Text for the cancel button',
			table: { defaultValue: { summary: 'Cancel' } },
		},
	},
}

export default meta

type Story = StoryObj<ConfirmChangesDialog>

function storyWith(changes: ConfirmChangesEntry[]): Story {
	return {
		args: {
			title: 'Confirm changes',
			message: 'Review the changes below before saving them.',
			changes,
			confirmText: 'Save changes',
			cancelText: 'Cancel',
		},
		render: (args) => ({
			props: args,
			template: `
				<button appButton (click)="dialog.show()">Review changes</button>

				<app-confirm-changes-dialog #dialog
					[title]="title"
					[message]="message"
					[changes]="changes"
					[confirmText]="confirmText"
					[cancelText]="cancelText"
				/>
			`,
		}),
	}
}

/**
 * Profile fields only.
 */
export const ProfileOnly: Story = storyWith([
	{ label: 'First name', before: 'Ada', after: 'Grace' },
	{ label: 'Email', before: 'ada@example.com', after: 'grace@example.com' },
])

/**
 * Role additions/removals, shown as the full role list before and after.
 */
export const RolesOnly: Story = storyWith([{ label: 'Roles', before: 'Editor', after: 'Administrator, Editor' }])

/**
 * Account status change.
 */
export const StatusOnly: Story = storyWith([{ label: 'Status', before: 'Active', after: 'Disabled' }])

/**
 * Profile, roles, and status changed together — the whole edit is confirmed at once.
 */
export const Combined: Story = storyWith([
	{ label: 'First name', before: 'Ada', after: 'Grace' },
	{ label: 'Last name', before: 'Lovelace', after: 'Hopper' },
	{ label: 'Email', before: 'ada@example.com', after: 'grace@example.com' },
	{ label: 'Roles', before: 'Editor', after: 'Administrator' },
	{ label: 'Status', before: 'Active', after: 'Disabled' },
])

/**
 * Mobile viewport (375 px) — long values wrap inside each row instead of overflowing the dialog.
 */
export const MobileViewport: Story = {
	...Combined,
	parameters: {
		docs: { canvas: { sourceState: 'shown' } },
		viewport: { defaultViewport: 'mobile' },
	},
}
