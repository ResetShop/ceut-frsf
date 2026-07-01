import { TestBed } from '@angular/core/testing'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import type { RoleData } from '@contracts/role/role.types'
import { mapRoleFromData } from '@domain/access/role.mapper'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { createMockRoleData } from '@providers/roles/roles.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { RoleCard } from './role-card'

function buildRole(overrides: Partial<RoleData> = {}) {
	return mapRoleFromData(createMockRoleData(overrides))
}

describe('RoleCard', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderCard(overrides: Partial<RoleData> = {}) {
		const editSpy = fn()
		const deleteSpy = fn()
		const view = await render(RoleCard, {
			inputs: { role: buildRole(overrides) },
			on: { edit: editSpy, delete: deleteSpy },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ hasPermission: () => true }))
		view.fixture.detectChanges()
		return { view, editSpy, deleteSpy }
	}

	it('renders the role name and code badge', async () => {
		await renderCard({ name: 'Administrator', code: 'admin' })

		expect(screen.getByText('Administrator')).toBeInTheDocument()
		expect(screen.getByText('admin')).toBeInTheDocument()
	})

	it('renders the description when present', async () => {
		await renderCard({ description: 'Full system access' })

		expect(screen.getByText('Full system access')).toBeInTheDocument()
	})

	it('does not render a description when it is null', async () => {
		await renderCard({ description: null, name: 'TestRole' })

		expect(screen.getByText('TestRole')).toBeInTheDocument()
		// Only the name and code render — no description paragraph
		expect(screen.queryByText('Full system access')).not.toBeInTheDocument()
	})

	it('renders the delete button for a removable role', async () => {
		await renderCard({ removable: true })

		expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
	})

	it('hides the delete button for non-removable roles', async () => {
		await renderCard({ removable: false })

		expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
	})

	it('emits edit when the edit button is clicked', async () => {
		const user = userEvent.setup()
		const { editSpy } = await renderCard()

		await user.click(screen.getByRole('button', { name: /edit/i }))

		expect(editSpy.calls).toHaveLength(1)
	})

	it('emits delete when the delete button is clicked', async () => {
		const user = userEvent.setup()
		const { deleteSpy } = await renderCard({ removable: true })

		await user.click(screen.getByRole('button', { name: /delete/i }))

		expect(deleteSpy.calls).toHaveLength(1)
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:roles:update')).toBe(true)
		expect(validIdentifiers.has('admin:roles:delete')).toBe(true)
	})
})
