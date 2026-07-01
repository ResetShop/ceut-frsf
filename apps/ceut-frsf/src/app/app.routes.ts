import { Route } from '@angular/router'
import { authGuard } from '@guards/auth.guard'
import { forcedPasswordChangeGuard } from '@guards/forced-password-change.guard'
import { noAuthGuard } from '@guards/no-auth.guard'
import { NamedRoute } from '@resetshop/angular-core/interfaces/navigation'

export const appRoutes: Route[] = [
	{
		path: '',
		title: 'LANDING.PAGE_TITLE',
		pathMatch: 'full',
		loadComponent: () => import('./pages/landing/landing'),
	},
	{
		// Declared before 'auth' so it is NOT swept into the noAuthGuard group: a must-change user
		// IS authenticated, so noAuthGuard would bounce them to /dashboard and forcedPasswordChangeGuard
		// would bounce them back here — an infinite loop. This route uses authGuard only.
		path: 'auth/change-password',
		title: 'AUTH.CHANGE_PASSWORD.TITLE',
		canActivate: [authGuard],
		loadComponent: () => import('@pages/auth/change-password/change-password'),
	},
	{
		path: 'auth',
		title: 'AUTH.LOGIN.TITLE',
		canActivate: [noAuthGuard],
		loadChildren: () => import('./pages/auth.routes'),
	},
	{
		path: 'dashboard',
		title: 'DASHBOARD.BREADCRUMB',
		canActivate: [authGuard, forcedPasswordChangeGuard],
		loadChildren: () => import('./pages/dashboard/dashboard.routes'),
	},
	{
		path: '**',
		title: 'Wildcard',
		redirectTo: 'auth/login',
		pathMatch: 'full',
	},
] satisfies NamedRoute[]
