import { provideRouter } from '@angular/router'
import { createMockUser } from '@mocks/user.mock'
import { AuthApi } from '@providers/auth/auth.interface'
import { InMemoryAuthApi } from '@providers/auth/auth.mock'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import { Navigation } from '@resetshop/angular-core/navigation/navigation'
import { clearAllMocks } from '@resetshop/util/test-utils'
import { AuthStore } from '@store/auth/auth.store'
import { render, screen } from '@testing-library/angular'
import { dashboardNavigationConfig } from '../../dashboard.navigation'
import DashboardHome from './dashboard-home'

describe('DashboardHome', () => {
	const navigationMock = {
		sections: () => [],
		breadcrumbs: () => [],
	}

	const baseProviders = () => [
		provideRouter([]),
		provideTranslationMock(),
		AuthStore,
		{ provide: AuthApi, useValue: new InMemoryAuthApi() },
		{ provide: Navigation, useValue: navigationMock },
	]

	beforeEach(() => {
		clearAllMocks()
	})

	it('renders the no-module-access alert when the current user has no permissions', async () => {
		const { fixture } = await render(DashboardHome, { providers: baseProviders() })
		const store = fixture.debugElement.injector.get(AuthStore)
		store.updateCurrentUser(createMockUser({ permissions: [] }))
		fixture.detectChanges()

		// Alert's default variant binds role="status"; that's the semantic query.
		expect(screen.getByRole('status')).toBeInTheDocument()
	})

	it('hides the no-module-access alert when the current user has at least one permission', async () => {
		const { fixture } = await render(DashboardHome, { providers: baseProviders() })
		const store = fixture.debugElement.injector.get(AuthStore)
		store.updateCurrentUser(
			createMockUser({
				// Inline IPermission literal mirrors the pattern in auth.store.spec.ts —
				// `createMockPermissionData()` returns `PermissionData` (no `identifier`),
				// not `IPermission`, so it isn't directly substitutable here.
				permissions: [
					{
						id: 1,
						name: 'Read users',
						description: 'View users',
						module: 'admin',
						resource: 'users',
						action: 'read',
						identifier: 'admin:users:read',
					},
				],
			}),
		)
		fixture.detectChanges()

		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('links to the health page with its description', async () => {
		await render(DashboardHome, {
			providers: [
				...baseProviders(),
				{ provide: Navigation, useValue: { ...navigationMock, sections: () => dashboardNavigationConfig.sections } },
			],
		})

		const healthCard = screen.getByRole('link', { name: /health/i })

		expect(healthCard).toHaveAttribute('href', '/dashboard/health')
		expect(healthCard).toHaveTextContent('Monitor the health and status of your application services.')
	})

	it('offers no Account or Settings card, since both are reached from the sidebar user menu', async () => {
		await render(DashboardHome, {
			providers: [
				...baseProviders(),
				{ provide: Navigation, useValue: { ...navigationMock, sections: () => dashboardNavigationConfig.sections } },
			],
		})

		expect(screen.queryByRole('link', { name: /account/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
	})
})
