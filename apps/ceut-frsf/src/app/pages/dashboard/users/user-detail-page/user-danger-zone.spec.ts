import { TestBed } from '@angular/core/testing'
import { PERMISSION_DEFINITIONS } from '@contracts/permission/permission.constants'
import type { ManagedUser } from '@contracts/user/user.types'
import { mapManagedUserResponse } from '@domain/user-management/managed-user.mapper'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { createMockManagedUser } from '@providers/users/users.mock'
import { CURRENT_USER_SOURCE } from '@resetshop/angular-core/auth/current-user.token'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { fireEvent, render, screen, within } from '@testing-library/angular'
import { UserDangerZone } from './user-danger-zone'

function buildUser(overrides: Partial<ManagedUser> = {}) {
	return mapManagedUserResponse(createMockManagedUser(overrides))
}

describe('UserDangerZone', () => {
	beforeEach(() => clearAllMocks())

	async function renderZone(permissions: string[], overrides: Partial<ManagedUser> = {}) {
		const view = await render(UserDangerZone, {
			inputs: { user: buildUser({ id: 1, ...overrides }) },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ id: 999, hasPermission: (id) => permissions.includes(id) }),
		)
		view.fixture.detectChanges()
		return view
	}

	it('hides the danger zone when the target user is the current user', async () => {
		const view = await render(UserDangerZone, {
			inputs: { user: buildUser({ id: 42 }) },
			providers: [
				{ provide: AuthApi, useValue: new InMemoryAuthApi() },
				{ provide: CURRENT_USER_SOURCE, useExisting: AuthStore },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ id: 42, hasPermission: () => true }))
		view.fixture.detectChanges()

		expect(screen.queryByRole('button', { name: /delete user/i })).not.toBeInTheDocument()
	})

	it('hides the delete button without admin:users:delete', async () => {
		await renderZone(['admin:users:read'])

		expect(screen.queryByRole('button', { name: /delete user/i })).not.toBeInTheDocument()
	})

	it('emits deleteConfirmed once the deletion is confirmed', async () => {
		const view = await renderZone(['admin:users:delete'], { id: 7 })
		const onDeleteConfirmed = fn()
		view.fixture.componentInstance.deleteConfirmed.subscribe(() => onDeleteConfirmed())

		fireEvent.click(screen.getByRole('button', { name: /delete user/i }))
		TestBed.tick()
		const dialog = screen.getByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: /delete/i }))
		TestBed.tick()

		expect(onDeleteConfirmed.calls).toHaveLength(1)
	})
})

describe('permission identifiers', () => {
	const validIdentifiers = new Set(PERMISSION_DEFINITIONS.map((p) => p.identifier))

	it('should use valid permission identifiers', () => {
		expect(validIdentifiers.has('admin:users:delete')).toBe(true)
	})
})
