import type { Route } from '@angular/router'
import { authGuard } from '@guards/auth.guard'
import { forcedPasswordChangeGuard } from '@guards/forced-password-change.guard'
import Dashboard from '@pages/dashboard/dashboard'
import { appRoutes } from '../../app.routes'
import accountRoutes from './account.routes'

describe('account routes', () => {
	const accountRoute = appRoutes.find((route) => route.path === 'account') as Route
	const dashboardRoute = appRoutes.find((route) => route.path === 'dashboard') as Route

	it('is a top-level route guarded exactly like the dashboard', () => {
		expect(accountRoute.canActivate).toEqual([authGuard, forcedPasswordChangeGuard])
		expect(accountRoute.canActivate).toEqual(dashboardRoute.canActivate)
	})

	it('requires no permission, so every signed-in user can reach it', () => {
		const routes: Route[] = [accountRoute, ...accountRoutes, ...(accountRoutes[0].children ?? [])]

		expect(routes.every((route) => route.data?.['requiredPermission'] === undefined)).toBe(true)
	})

	it('renders inside the dashboard shell', () => {
		expect(accountRoutes[0].component).toBe(Dashboard)
	})
})
