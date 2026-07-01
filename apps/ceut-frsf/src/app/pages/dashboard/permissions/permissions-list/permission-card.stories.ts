import { mapPermission } from '@domain/access/role.mapper'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { PermissionCard } from './permission-card'

const meta: Meta<PermissionCard> = {
	component: PermissionCard,
	title: 'Pages/Dashboard/Permissions/PermissionCard',
	tags: ['autodocs'],
	decorators: [
		moduleMetadata({
			imports: [PermissionCard],
		}),
	],
	parameters: {
		docs: {
			description: {
				component:
					'Card representation of a single permission, used by the permissions list in card display mode. Has no actions — permissions are read-only in the reference app.',
			},
			canvas: { sourceState: 'shown' },
		},
	},
}

export default meta
type Story = StoryObj<PermissionCard>

/**
 * Permission with a description.
 */
export const Default: Story = {
	args: {
		permission: mapPermission(
			createMockPermissionData({
				resource: 'users',
				action: 'read',
				description: 'Can read user records, including profile data and role assignments.',
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-permission-card [permission]="permission" />`,
	}),
}

/**
 * Permission with no description — only the resource/action header and identifier badge render.
 */
export const NoDescription: Story = {
	args: {
		permission: mapPermission(
			createMockPermissionData({
				resource: 'roles',
				action: 'delete',
				description: null,
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-permission-card [permission]="permission" />`,
	}),
}
