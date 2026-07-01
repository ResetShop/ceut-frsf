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
import { CreateRoleDrawer } from './create-role-drawer'

describe('CreateRoleDrawer', () => {
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

	async function renderAndOpenRaw() {
		const { fixture } = await render(CreateRoleDrawer, {
			providers: [
				{ provide: RolesApi, useValue: rolesApiMock },
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: Translation, useValue: mockTranslation },
			],
		})
		TestBed.tick()
		fixture.componentInstance.open()
		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_SPINNER_MIN_DISPLAY))
		fixture.detectChanges()
		return { fixture }
	}

	async function renderAndOpen() {
		await renderAndOpenRaw()
	}

	it('should render drawer with create title', async () => {
		await renderAndOpen()

		expect(screen.getByText('Create Role')).toBeInTheDocument()
	})

	it('should render name, code, and description form fields', async () => {
		await renderAndOpen()

		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByText('Code')).toBeInTheDocument()
		expect(screen.getByText('Description')).toBeInTheDocument()
	})

	it('should show code as disabled auto-generated field', async () => {
		await renderAndOpen()

		expect(screen.getByText(/auto-generated from name/i)).toBeInTheDocument()
	})

	it('should render create button', async () => {
		await renderAndOpen()

		expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
	})

	it('should render cancel button', async () => {
		await renderAndOpen()

		expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
	})

	it('should call createRoleWithPermissions with correct params on submit', async () => {
		rolesApiMock.create.mockReturnValue(
			of({ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null }),
		)
		rolesApiMock.assignPermissions.mockReturnValue(of({}))
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByRole('textbox', { name: /name/i })
		fireEvent.input(nameInput, { target: { value: 'Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /create/i }))
		fixture.detectChanges()

		expect(rolesApiMock.create.calls).toHaveLength(1)
		expect(rolesApiMock.create.calls[0][0]).toEqual(expect.objectContaining({ name: 'Admin' }))
	})

	it('should show error alert when creation fails', async () => {
		const httpError = new HttpErrorResponse({
			error: { error: 'A role with this code already exists' },
			status: 409,
		})
		rolesApiMock.create.mockReturnValue(throwError(() => httpError))
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByRole('textbox', { name: /name/i })
		fireEvent.input(nameInput, { target: { value: 'Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /create/i }))
		fixture.detectChanges()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('A role with this code already exists')).toBeInTheDocument()
	})

	it('should keep drawer open when creation fails', async () => {
		rolesApiMock.create.mockReturnValue(
			throwError(() => new HttpErrorResponse({ error: { error: 'Error' }, status: 409 })),
		)
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByRole('textbox', { name: /name/i })
		fireEvent.input(nameInput, { target: { value: 'Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /create/i }))
		fixture.detectChanges()

		expect(screen.getByText('Create Role')).toBeInTheDocument()
	})

	it('should show spinner and "Creating..." label during submission', async () => {
		rolesApiMock.create.mockReturnValue(
			of({ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null }),
		)
		rolesApiMock.assignPermissions.mockReturnValue(of({}))
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByRole('textbox', { name: /name/i })
		fireEvent.input(nameInput, { target: { value: 'Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /create/i }))
		fixture.detectChanges()
		TestBed.tick()
		fixture.detectChanges()

		expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
	})

	it('should close drawer on successful creation', async () => {
		rolesApiMock.create.mockReturnValue(
			of({ id: 1, name: 'Admin', code: 'admin', description: null, removable: true, createdAt: null, updatedAt: null }),
		)
		rolesApiMock.assignPermissions.mockReturnValue(of({}))
		const { fixture } = await renderAndOpenRaw()

		const nameInput = screen.getByRole('textbox', { name: /name/i })
		fireEvent.input(nameInput, { target: { value: 'Admin' } })
		fixture.detectChanges()

		fireEvent.click(screen.getByRole('button', { name: /create/i }))
		fixture.detectChanges()
		TestBed.tick()
		fixture.detectChanges()

		await advanceTimersByTimeAsync(parseDurationToMs(DRAWER_CLOSE_AFTER_SUCCESS_DELAY))
		fixture.detectChanges()

		expect(nameInput).toHaveValue('')
	})
})
