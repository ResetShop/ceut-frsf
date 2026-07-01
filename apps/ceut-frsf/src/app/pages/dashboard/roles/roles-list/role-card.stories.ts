import { inject, provideAppInitializer } from '@angular/core'
import { mapRoleFromData } from '@domain/access/role.mapper'
import { createMockUser } from '@mocks/user.mock'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { createMockRoleData } from '@providers/roles/roles.mock'
import { AuthStore } from '@store/auth/auth.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { RoleCard } from './role-card'

function seedAuthStoreWithAllPermissions() {
	return provideAppInitializer(() => {
		inject(AuthStore).updateCurrentUser(createMockUser({ hasPermission: () => true }))
	})
}

const meta: Meta<RoleCard> = {
	component: RoleCard,
	title: 'Pages/Dashboard/Roles/RoleCard',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideAuthMock(), seedAuthStoreWithAllPermissions()],
		}),
		moduleMetadata({
			imports: [RoleCard],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: 'Card representation of a single role, used by the roles list in card display mode.',
			},
			canvas: { sourceState: 'shown' },
		},
	},
}

export default meta
type Story = StoryObj<RoleCard>

/**
 * Removable role with a description — Edit and Delete buttons visible.
 */
export const Default: Story = {
	args: {
		role: mapRoleFromData(
			createMockRoleData({
				name: 'Administrator',
				code: 'admin',
				description: 'Full system access including user, role, and permission management.',
				removable: true,
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-role-card [role]="role" />`,
	}),
}

/**
 * Non-removable role (e.g., a system role) — Delete button is hidden.
 */
export const NonRemovable: Story = {
	args: {
		role: mapRoleFromData(
			createMockRoleData({
				name: 'Super Admin',
				code: 'super_admin',
				description: 'System-managed role; cannot be deleted.',
				removable: false,
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-role-card [role]="role" />`,
	}),
}
