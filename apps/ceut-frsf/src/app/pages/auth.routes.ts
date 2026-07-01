import { NamedRoute } from '@resetshop/angular-core/interfaces/navigation'

export default [
	{
		path: 'login',
		title: 'Login',
		loadComponent: () => import('@pages/auth/login/login'),
	},
	{
		path: 'reset-password/confirm',
		title: 'Reset Password',
		loadComponent: () => import('@pages/auth/reset-password-confirm/reset-password-confirm'),
	},
	{
		path: 'reset-password',
		title: 'Reset Password',
		loadComponent: () => import('@pages/auth/reset-password/reset-password'),
	},
] satisfies NamedRoute[]
