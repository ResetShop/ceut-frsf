import { TestBed } from '@angular/core/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { RolesApi } from '@providers/roles/roles.interface'
import { UsersApi } from '@providers/users/users.interface'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen } from '@testing-library/angular'
import { of } from 'rxjs'
import { UserRolesSection } from './user-roles-section'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

const ROLES = [
	{ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null },
	{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
]

describe('UserRolesSection', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>
	let rolesApiMock: Record<keyof RolesApi, MockFn>

	beforeEach(() => {
		clearAllMocks()
		usersApiMock = {
			getAll: fn(),
			getById: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			updateStatus: fn(),
			resetPassword: fn(),
		}
		rolesApiMock = {
			getAll: fn(),
			getAllUnpaginated: fn(),
			getByIdWithPermissions: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			assignPermissions: fn(),
		}
		usersApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of(ROLES))
	})

	async function renderSection(canUpdate = true, overrides: Partial<ManagedUser> = {}) {
		const view = await render(UserRolesSection, {
			inputs: { user: buildUser(overrides) },
			providers: [
				{ provide: UsersApi, useValue: usersApiMock },
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
				...provideSignalFormsConfig({}),
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => (id === 'admin:users:update' ? canUpdate : true) }),
		)
		view.fixture.detectChanges()
		return view
	}

	it('renders the assigned roles as badges', async () => {
		await renderSection(true, {
			roles: [ROLES[0]],
		})

		expect(screen.getByText('Admin')).toBeInTheDocument()
	})

	it('renders the empty message when the user has no roles', async () => {
		await renderSection(true, { roles: [] })

		expect(screen.getByText('No roles assigned')).toBeInTheDocument()
	})

	it('hides the edit roles button when the user lacks admin:users:update', async () => {
		await renderSection(false)

		expect(screen.queryByRole('button', { name: /edit roles/i })).not.toBeInTheDocument()
	})

	it('opens the edit roles drawer when the edit roles button is clicked', async () => {
		await renderSection(true)

		fireEvent.click(screen.getByRole('button', { name: /edit roles/i }))
		TestBed.tick()

		expect(screen.getByRole('dialog', { name: /edit roles/i })).toBeInTheDocument()
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:update')).toBe(true)
	})
})
