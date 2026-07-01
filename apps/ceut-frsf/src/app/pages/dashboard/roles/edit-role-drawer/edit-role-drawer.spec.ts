import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { PermissionsApi } from '@providers/permissions/permissions.interface'
import { RolesApi } from '@providers/roles/roles.interface'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { DRAWER_SPINNER_MIN_DISPLAY } from '@resetshop/ui/drawer/drawer-loading'
import { parseDurationToMs } from '@resetshop/util'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	spyOn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { fireEvent, render, screen } from '@testing-library/angular'
import { of, throwError } from 'rxjs'
import { DRAWER_CLOSE_AFTER_SUCCESS_DELAY } from '../../dashboard.constants'
import { EditRoleDrawer } from './edit-role-drawer'

describe('EditRoleDrawer', () => {
	let rolesApiMock: Record<keyof RolesApi, MockFn>
	let permissionsApiMock: Record<keyof PermissionsApi, MockFn>

	beforeEach(() => {
		useFakeTimers()
		clearAllMocks()
		spyOn(console, 'error')

		rolesApiMock = {
			getAll: fn(),
			getAllUnpaginated: fn(),
			getByIdWithPermissions: fn(),
			create: fn(),
			update: fn(),
			delete: fn(),
			assignPermissions: fn(),
		}

		permissionsApiMock = {
			getAllUnpaginated: fn(),
		}

		rolesApiMock.getAll.mockReturnValue(of({ data: [], total: 0, limit: 10, offset: 0 }))
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of([]))
	})

	afterEach(() => {
		useRealTimers()
	})

	async function renderAndOpenRaw(roleId = 1) {
		rolesApiMock.getByIdWithPermissions.mockReturnValue(
			of({
				id: roleId,
				code: 'admin',
				name: 'Admin',
				description: 'Administrator role',
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [],
			}),
		)

		const { fixture } = await render(EditRoleDrawer, {
			providers: [
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.tick()
		fixture.componentInstance.open(roleId)
		TestBed.tick()
		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_SPINNER_MIN_DISPLAY))
		fixture.detectChanges()
		return { fixture }
	}

	async function renderAndOpen(roleId = 1) {
		await renderAndOpenRaw(roleId)
	}

	it('should render drawer with edit title', async () => {
		await renderAndOpen()

		expect(screen.getByText('Edit Role')).toBeInTheDocument()
	})

	it('should render name and description form fields', async () => {
		await renderAndOpen()

		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Description')).toBeInTheDocument()
	})

	it('should show code as disabled input', async () => {
		await renderAndOpen()

		expect(screen.getByText('Code cannot be changed')).toBeInTheDocument()
		expect(screen.getByDisplayValue('admin')).toBeDisabled()
	})

	it('should render save button', async () => {
		await renderAndOpen()

		expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
	})

	it('should render cancel button', async () => {
		await renderAndOpen()

		expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
	})

	it('should populate form with existing role data', async () => {
		await renderAndOpen()

		expect(screen.getByDisplayValue('Admin')).toBeInTheDocument()
		expect(screen.getByDisplayValue('Administrator role')).toBeInTheDocument()
	})

	it('should call update with correct params on submit', async () => {
		rolesApiMock.update.mockReturnValue(
			of({
				id: 1,
				name: 'Updated',
				code: 'admin',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
			}),
		)
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByDisplayValue('Admin')
		fireEvent.input(nameInput, { target: { value: 'Updated Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /save/i }))
		fixture.detectChanges()

		expect(rolesApiMock.update.calls).toHaveLength(1)
		expect(rolesApiMock.update.calls[0][1]).toEqual(expect.objectContaining({ name: 'Updated Admin' }))
	})

	it('should show error alert when update fails', async () => {
		const httpError = new HttpErrorResponse({
			error: { error: 'Cannot remove your own admin permission' },
			status: 403,
		})
		rolesApiMock.update.mockReturnValue(throwError(() => httpError))
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByDisplayValue('Admin')
		fireEvent.input(nameInput, { target: { value: 'Updated Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /save/i }))
		fixture.detectChanges()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('Cannot remove your own admin permission')).toBeInTheDocument()
	})

	it('should keep drawer open when update fails', async () => {
		rolesApiMock.update.mockReturnValue(
			throwError(() => new HttpErrorResponse({ error: { error: 'Error' }, status: 409 })),
		)
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByDisplayValue('Admin')
		fireEvent.input(nameInput, { target: { value: 'Updated' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /save/i }))
		fixture.detectChanges()

		expect(screen.getByText('Edit Role')).toBeInTheDocument()
	})

	it('should show spinner and "Saving..." label during submission', async () => {
		rolesApiMock.update.mockReturnValue(
			of({
				id: 1,
				name: 'Updated',
				code: 'admin',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
			}),
		)
		rolesApiMock.getByIdWithPermissions.mockReturnValue(
			of({
				id: 1,
				code: 'admin',
				name: 'Updated',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [],
			}),
		)
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByDisplayValue('Admin')
		fireEvent.input(nameInput, { target: { value: 'Updated' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /save/i }))
		fixture.detectChanges()
		TestBed.tick()
		fixture.detectChanges()

		expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
	})

	it('should close drawer on successful update', async () => {
		rolesApiMock.update.mockReturnValue(
			of({
				id: 1,
				name: 'Updated',
				code: 'admin',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
			}),
		)
		rolesApiMock.getByIdWithPermissions.mockReturnValue(
			of({
				id: 1,
				code: 'admin',
				name: 'Updated',
				description: null,
				removable: true,
				createdAt: null,
				updatedAt: null,
				permissions: [],
			}),
		)
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByDisplayValue('Admin')
		fireEvent.input(nameInput, { target: { value: 'Updated' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /save/i }))
		fixture.detectChanges()
		TestBed.tick()
		fixture.detectChanges()

		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_CLOSE_AFTER_SUCCESS_DELAY))
		fixture.detectChanges()

		expect(nameInput).toHaveValue('')
	})
})
