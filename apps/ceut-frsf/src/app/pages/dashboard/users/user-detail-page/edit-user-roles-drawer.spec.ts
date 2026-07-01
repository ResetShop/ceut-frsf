import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createPaginatedResponse } from '@mocks/pagination.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { RolesApi } from '@providers/roles/roles.interface'
import { UsersApi } from '@providers/users/users.interface'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { DRAWER_SPINNER_MIN_DISPLAY } from '@resetshop/ui/drawer/drawer-loading'
import { parseDurationToMs } from '@resetshop/util'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen } from '@testing-library/angular'
import { of, throwError } from 'rxjs'
import { EditUserRolesDrawer } from './edit-user-roles-drawer'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

const ROLES = [
	{ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null },
	{ id: 2, name: 'Editor', code: 'editor', description: null, removable: true, createdAt: null, updatedAt: null },
]

describe('EditUserRolesDrawer', () => {
	let usersApiMock: Record<keyof UsersApi, MockFn>
	let rolesApiMock: Record<keyof RolesApi, MockFn>

	beforeEach(() => {
		useFakeTimers()
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
		usersApiMock.update.mockReturnValue(of(createMockManagedUser()))
		rolesApiMock.getAll.mockReturnValue(of(createPaginatedResponse([])))
		rolesApiMock.getAllUnpaginated.mockReturnValue(of(ROLES))
	})

	afterEach(() => useRealTimers())

	async function renderDrawer(overrides: Partial<ManagedUser> = {}) {
		const view = await render(EditUserRolesDrawer, {
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
		return view
	}

	it('saves the updated role selection via updateUser', async () => {
		const view = await renderDrawer({ id: 8, roles: [ROLES[0]] })
		view.fixture.componentInstance.open()
		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_SPINNER_MIN_DISPLAY))
		view.fixture.detectChanges()

		// Add the Editor role on top of the pre-selected Admin role.
		fireEvent.click(screen.getByRole('checkbox', { name: /editor/i }))
		fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		TestBed.tick()

		expect(usersApiMock.update.calls).toHaveLength(1)
		expect(usersApiMock.update.calls[0][0]).toBe(8)
		expect(usersApiMock.update.calls[0][1]).toMatchObject({ roleIds: [1, 2] })
	})

	it('shows a destructive alert inline when the update fails', async () => {
		usersApiMock.update.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Role assignment failed' } })),
		)
		const view = await renderDrawer({ id: 8, roles: [ROLES[0]] })
		view.fixture.componentInstance.open()
		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_SPINNER_MIN_DISPLAY))
		view.fixture.detectChanges()

		fireEvent.click(screen.getByRole('checkbox', { name: /editor/i }))
		fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		view.fixture.detectChanges()

		expect(screen.getByRole('alert')).toHaveTextContent('Role assignment failed')
	})
})
