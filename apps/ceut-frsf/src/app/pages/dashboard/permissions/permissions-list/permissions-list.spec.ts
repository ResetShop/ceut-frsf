import { BreakpointObserver } from '@angular/cdk/layout'
import { TestBed } from '@angular/core/testing'
import { mockTranslation } from '@providers/i18n/translation.mock'
import { PermissionsApi } from '@providers/permissions/permissions.interface'
import { createMockPermissionData } from '@providers/permissions/permissions.mock'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	fn,
	type MockFn,
	spyOn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import { NEVER, of, throwError } from 'rxjs'
import PermissionsList from './permissions-list'

describe('PermissionsList', () => {
	let permissionsApiMock: Record<keyof PermissionsApi, MockFn>
	let breakpointObserverMock: { observe: MockFn }

	beforeEach(() => {
		clearAllMocks()
		useFakeTimers()
		spyOn(console, 'error')

		permissionsApiMock = {
			getAllUnpaginated: fn(),
		}

		breakpointObserverMock = {
			observe: fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
		}

		permissionsApiMock.getAllUnpaginated.mockReturnValue(of([]))
	})

	afterEach(() => {
		useRealTimers()
	})

	async function renderComponent() {
		const view = await render(PermissionsList, {
			providers: [
				{ provide: PermissionsApi, useValue: permissionsApiMock },
				{ provide: Translation, useValue: mockTranslation },
				{ provide: BreakpointObserver, useValue: breakpointObserverMock },
			],
		})
		TestBed.tick()
		await advanceTimersByTimeAsync(1000)
		view.fixture.detectChanges()
		return view
	}

	it('should render the page heading', async () => {
		await renderComponent()

		expect(screen.getByRole('heading', { name: /permissions/i })).toBeInTheDocument()
	})

	it('should render the description text', async () => {
		await renderComponent()

		expect(screen.getByText(/module:resource:action/)).toBeInTheDocument()
	})

	it('should render data table when there is no error', async () => {
		const permissions = [
			createMockPermissionData({ id: 1, resource: 'users', action: 'read' }),
			createMockPermissionData({ id: 2, resource: 'users', action: 'write', name: 'admin:users:write' }),
		]
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))

		await renderComponent()

		expect(screen.getByRole('table')).toBeInTheDocument()
		expect(screen.getByText('Permissions grouped by resource')).toBeInTheDocument()
	})

	it('should not render alert when loading', async () => {
		permissionsApiMock.getAllUnpaginated.mockReturnValue(NEVER)

		await renderComponent()

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('should render alert with error message when hasReadError is true', async () => {
		permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.getByRole('alert')).toBeInTheDocument()
		expect(screen.getByText('Failed to load permissions')).toBeInTheDocument()
	})

	it('should not render data table when there is an error', async () => {
		permissionsApiMock.getAllUnpaginated.mockReturnValue(throwError(() => new Error('Network error')))

		await renderComponent()

		expect(screen.queryByRole('table')).not.toBeInTheDocument()
	})

	it('should render column headers', async () => {
		const permissions = [createMockPermissionData()]
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))

		await renderComponent()

		expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /identifier/i })).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument()
	})

	it('should display permission identifier in the table', async () => {
		const permissions = [
			createMockPermissionData({ id: 1, resource: 'users', action: 'read', description: 'Can read user records' }),
		]
		permissionsApiMock.getAllUnpaginated.mockReturnValue(of(permissions))

		await renderComponent()

		expect(screen.getByText('admin:users:read')).toBeInTheDocument()
		expect(screen.getByText('Can read user records')).toBeInTheDocument()
	})
})
