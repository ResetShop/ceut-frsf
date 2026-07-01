import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { PermissionSelector, type PermissionGroup } from './permission-selector'

function createMockGroups(): PermissionGroup[] {
	return [
		{
			resource: 'users',
			permissions: [
				{
					id: 1,
					name: 'Read Users',
					description: 'Can read users',
					module: 'admin',
					resource: 'users',
					action: 'read',
					identifier: 'users:read',
				},
				{
					id: 2,
					name: 'Write Users',
					description: null,
					module: 'admin',
					resource: 'users',
					action: 'write',
					identifier: 'users:write',
				},
			],
		},
		{
			resource: 'roles',
			permissions: [
				{
					id: 3,
					name: 'Read Roles',
					description: 'Can read roles',
					module: 'admin',
					resource: 'roles',
					action: 'read',
					identifier: 'roles:read',
				},
			],
		},
	]
}

describe('PermissionSelector', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderComponent(value: number[] = []) {
		return render(PermissionSelector, {
			inputs: {
				groups: createMockGroups(),
				value,
			},
		})
	}

	it('should render grouped permissions by resource', async () => {
		await renderComponent()

		expect(screen.getByText('users')).toBeInTheDocument()
		expect(screen.getByText('roles')).toBeInTheDocument()
		expect(screen.getByText('Read Users')).toBeInTheDocument()
		expect(screen.getByText('Write Users')).toBeInTheDocument()
		expect(screen.getByText('Read Roles')).toBeInTheDocument()
	})

	it('should display permission descriptions', async () => {
		await renderComponent()

		expect(screen.getByText(/Can read users/)).toBeInTheDocument()
		expect(screen.getByText(/Can read roles/)).toBeInTheDocument()
	})

	it('should show pre-selected permissions as checked', async () => {
		await renderComponent([1, 3])

		const checkboxes = screen.getAllByRole('checkbox')
		// Group checkboxes: users (index 0), roles (index 3)
		// Permission checkboxes: Read Users (1), Write Users (2), Read Roles (4)
		expect(checkboxes[1]).toBeChecked() // Read Users
		expect(checkboxes[2]).not.toBeChecked() // Write Users
		expect(checkboxes[4]).toBeChecked() // Read Roles
	})

	it('should toggle individual permission on click', async () => {
		const user = userEvent.setup()
		await renderComponent()

		const readUsersCheckbox = screen.getAllByRole('checkbox')[1] // Read Users

		await user.click(readUsersCheckbox)

		expect(readUsersCheckbox).toBeChecked()
	})

	it('should toggle all permissions in a group via "Select All" checkbox', async () => {
		const user = userEvent.setup()
		await renderComponent()

		const usersGroupCheckbox = screen.getAllByRole('checkbox')[0] // users group

		await user.click(usersGroupCheckbox)

		const checkboxes = screen.getAllByRole('checkbox')
		expect(checkboxes[1]).toBeChecked() // Read Users
		expect(checkboxes[2]).toBeChecked() // Write Users
	})

	it('should deselect all permissions when group is fully selected', async () => {
		const user = userEvent.setup()
		await renderComponent([1, 2])

		const usersGroupCheckbox = screen.getAllByRole('checkbox')[0]

		await user.click(usersGroupCheckbox)

		const checkboxes = screen.getAllByRole('checkbox')
		expect(checkboxes[1]).not.toBeChecked()
		expect(checkboxes[2]).not.toBeChecked()
	})
})
