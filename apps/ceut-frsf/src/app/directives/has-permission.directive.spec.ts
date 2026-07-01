import { Component, input } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import { HasPermissionDirective } from './has-permission.directive'

@Component({
	selector: 'app-test-host',
	standalone: true,
	imports: [HasPermissionDirective],
	template: `
		<button *hasPermission="permission()" data-testid="guarded-button">Action</button>
		<span data-testid="always-visible">Always here</span>
	`,
})
class TestHost {
	public readonly permission = input('admin:users:create')
}

describe('HasPermissionDirective', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	async function renderHost(permission = 'admin:users:create') {
		const view = await render(TestHost, {
			componentInputs: { permission },
			providers: [{ provide: AuthApi, useValue: new InMemoryAuthApi() }],
		})
		return view
	}

	it('should hide element when user is null', async () => {
		await renderHost()

		expect(screen.queryByTestId('guarded-button')).not.toBeInTheDocument()
		expect(screen.getByTestId('always-visible')).toBeInTheDocument()
	})

	it('should hide element when user lacks the permission', async () => {
		await renderHost()

		TestBed.inject(AuthStore).updateCurrentUser(createMockUser({ hasPermission: () => false }))

		expect(screen.queryByTestId('guarded-button')).not.toBeInTheDocument()
	})

	it('should show element when user has the permission', async () => {
		const { detectChanges } = await renderHost()

		TestBed.inject(AuthStore).updateCurrentUser(
			createMockUser({ hasPermission: (id: string) => id === 'admin:users:create' }),
		)
		detectChanges()

		expect(screen.getByTestId('guarded-button')).toBeInTheDocument()
	})

	it('should reactively hide element when user permissions change', async () => {
		const { detectChanges } = await renderHost()
		const store = TestBed.inject(AuthStore)

		store.updateCurrentUser(createMockUser({ hasPermission: (id: string) => id === 'admin:users:create' }))
		detectChanges()
		expect(screen.getByTestId('guarded-button')).toBeInTheDocument()

		store.updateCurrentUser(createMockUser({ hasPermission: () => false }))
		detectChanges()
		expect(screen.queryByTestId('guarded-button')).not.toBeInTheDocument()
	})
})
