import type { IRole } from '@domain/access/role.interface'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { RoleSelector } from './role-selector'

function createMockRoles(): IRole[] {
	return [
		{
			id: 1,
			name: 'Admin',
			description: 'Full access',
			code: 'admin',
			removable: true,
			createdAt: null,
			updatedAt: null,
			permissions: [],
			hasPermission: () => false,
		},
		{
			id: 2,
			name: 'Editor',
			description: null,
			code: 'editor',
			removable: true,
			createdAt: null,
			updatedAt: null,
			permissions: [],
			hasPermission: () => false,
		},
		{
			id: 3,
			name: 'Viewer',
			description: 'Read-only access',
			code: 'viewer',
			removable: true,
			createdAt: null,
			updatedAt: null,
			permissions: [],
			hasPermission: () => false,
		},
	]
}

describe('RoleSelector', () => {
	beforeEach(() => clearAllMocks())

	async function renderComponent(value: number[] = [], lockedRoleIds: number[] = []) {
		return render(RoleSelector, {
			inputs: {
				roles: createMockRoles(),
				value,
				lockedRoleIds,
			},
		})
	}

	it('should render all role names', async () => {
		await renderComponent()

		expect(screen.getByText('Admin')).toBeInTheDocument()
		expect(screen.getByText('Editor')).toBeInTheDocument()
		expect(screen.getByText('Viewer')).toBeInTheDocument()
	})

	it('should display role descriptions when present', async () => {
		await renderComponent()

		expect(screen.getByText(/Full access/)).toBeInTheDocument()
		expect(screen.getByText(/Read-only access/)).toBeInTheDocument()
	})

	it('should show pre-selected roles as checked', async () => {
		await renderComponent([1, 3])

		const checkboxes = screen.getAllByRole('checkbox')
		expect(checkboxes[0]).toBeChecked() // Admin
		expect(checkboxes[1]).not.toBeChecked() // Editor
		expect(checkboxes[2]).toBeChecked() // Viewer
	})

	it('should toggle a role on click', async () => {
		const user = userEvent.setup()
		await renderComponent()

		const editorCheckbox = screen.getAllByRole('checkbox')[1]

		await user.click(editorCheckbox)

		expect(editorCheckbox).toBeChecked()
	})

	it('should deselect a role on click when already selected', async () => {
		const user = userEvent.setup()
		await renderComponent([2])

		const editorCheckbox = screen.getAllByRole('checkbox')[1]
		expect(editorCheckbox).toBeChecked()

		await user.click(editorCheckbox)

		expect(editorCheckbox).not.toBeChecked()
	})

	it('renders a locked role as checked + disabled and prevents toggling it off', async () => {
		const user = userEvent.setup()
		await renderComponent([1], [1]) // Admin selected and locked

		const adminCheckbox = screen.getAllByRole('checkbox')[0]
		expect(adminCheckbox).toBeChecked()
		expect(adminCheckbox).toBeDisabled()

		await user.click(adminCheckbox)

		expect(adminCheckbox).toBeChecked()
	})

	it('still allows toggling non-locked roles when another role is locked', async () => {
		const user = userEvent.setup()
		await renderComponent([1], [1]) // Admin locked, Editor free

		const editorCheckbox = screen.getAllByRole('checkbox')[1]
		await user.click(editorCheckbox)

		expect(editorCheckbox).toBeChecked()
	})
})
