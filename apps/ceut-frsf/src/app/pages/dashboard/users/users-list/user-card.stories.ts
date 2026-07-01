import { inject, provideAppInitializer } from '@angular/core'
import { UserStatus } from '@contracts/user/user.constants'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createMockUser } from '@mocks/user.mock'
import { provideAuthMock } from '@providers/auth/auth.mock'
import { createMockManagedUser } from '@providers/users/users.mock'
import { AuthStore } from '@store/auth/auth.store'
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { UserCard } from './user-card'

function seedAuthStoreWithAllPermissions() {
	return provideAppInitializer(() => {
		inject(AuthStore).updateCurrentUser(createMockUser({ hasPermission: () => true }))
	})
}

const meta: Meta<UserCard> = {
	component: UserCard,
	title: 'Pages/Dashboard/Users/UserCard',
	tags: ['autodocs'],
	decorators: [
		applicationConfig({
			providers: [provideAuthMock(), seedAuthStoreWithAllPermissions()],
		}),
		moduleMetadata({
			imports: [UserCard],
		}),
	],
	parameters: {
		docs: {
			description: {
				component: 'Card representation of a single managed user, used by the users list in card display mode.',
			},
			canvas: { sourceState: 'shown' },
		},
	},
}

export default meta
type Story = StoryObj<UserCard>

/**
 * Active user with all permissions granted — Edit and Delete buttons visible,
 * status badge shows the default variant.
 */
export const Default: Story = {
	args: {
		user: mapManagedUserResponse(
			createMockManagedUser({
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane.doe@example.com',
				status: UserStatus.ACTIVE,
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-user-card [user]="user" />`,
	}),
}

/**
 * Disabled user — the status badge renders with the destructive variant.
 */
export const Disabled: Story = {
	args: {
		user: mapManagedUserResponse(
			createMockManagedUser({
				firstName: 'Sam',
				lastName: 'Smith',
				email: 'sam.smith@example.com',
				status: UserStatus.DISABLED,
			}),
		),
	},
	render: (args) => ({
		props: args,
		template: `<app-user-card [user]="user" />`,
	}),
}
