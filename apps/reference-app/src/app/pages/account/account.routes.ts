import { provideToast } from '@components/toast/toast.provider'
import Dashboard from '@pages/dashboard/dashboard'
import { dashboardNavigationConfig } from '@pages/dashboard/dashboard.navigation'
import { NamedRoute } from '@resetshop/angular-core/interfaces/navigation'
import { provideNavigation, provideNavigationConfig } from '@resetshop/angular-core/navigation/navigation.provider'

export default [
	{
		path: '',
		title: '',
		component: Dashboard,
		providers: [provideNavigation(), provideNavigationConfig(dashboardNavigationConfig), provideToast()],
		children: [
			{
				path: '',
				title: '',
				pathMatch: 'full',
				loadComponent: () => import('./account'),
			},
		],
	},
] satisfies NamedRoute[]
