import { UserStatus } from '@contracts/user/user.constants'
import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { UserStatusBadge } from './user-status-badge'

const meta: Meta<UserStatusBadge> = {
	component: UserStatusBadge,
	title: 'Pages/Dashboard/Users/UserStatusBadge',
	tags: ['autodocs'],
	decorators: [
		moduleMetadata({
			imports: [UserStatusBadge],
		}),
	],
	parameters: {
		docs: {
			description: {
				component:
					'Presentational status pill for a managed user. Maps the user status to a translated label and ' +
					'a badge variant (default for active, destructive otherwise), so every consumer renders the status identically.',
			},
			canvas: { sourceState: 'shown' },
		},
	},
}

export default meta
type Story = StoryObj<UserStatusBadge>

/**
 * Active user — the badge renders with the default variant.
 */
export const Active: Story = {
	args: { status: UserStatus.ACTIVE },
	render: (args) => ({
		props: args,
		template: `<app-user-status-badge [status]="status" />`,
	}),
}

/**
 * Disabled user — the badge renders with the destructive variant.
 */
export const Disabled: Story = {
	args: { status: UserStatus.DISABLED },
	render: (args) => ({
		props: args,
		template: `<app-user-status-badge [status]="status" />`,
	}),
}

/**
 * Deleted (soft-deleted) user — the badge renders with the destructive variant.
 */
export const Deleted: Story = {
	args: { status: UserStatus.DELETED },
	render: (args) => ({
		props: args,
		template: `<app-user-status-badge [status]="status" />`,
	}),
}
