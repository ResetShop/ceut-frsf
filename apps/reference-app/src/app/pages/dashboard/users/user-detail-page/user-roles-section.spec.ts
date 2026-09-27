import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { createMockManagedUser } from '@providers/users/users.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { UserRolesSection } from './user-roles-section'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

const ROLES = [
	{ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null },
	{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
]

describe('UserRolesSection', () => {
	beforeEach(() => clearAllMocks())

	async function renderSection(overrides: Partial<ManagedUser> = {}) {
		return render(UserRolesSection, {
			inputs: { user: buildUser(overrides) },
			providers: [{ provide: Translation, useValue: mockTranslation }],
		})
	}

	it('renders the assigned roles as badges', async () => {
		await renderSection({ roles: ROLES })

		expect(screen.getByText('Admin')).toBeInTheDocument()
		expect(screen.getByText('Editor')).toBeInTheDocument()
	})

	it('renders the empty message when the user has no roles', async () => {
		await renderSection({ roles: [] })

		expect(screen.getByText('No roles assigned')).toBeInTheDocument()
	})

	it('does not render an edit button', async () => {
		await renderSection({ roles: ROLES })

		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
