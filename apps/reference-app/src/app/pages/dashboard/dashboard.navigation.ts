import { featherActivity, featherHome } from '@ng-icons/feather-icons'
import type { NavigationConfig } from '@resetshop/angular-core/interfaces/navigation'
import { authorizationNavigation } from './authorization/authorization.navigation'
import { usersNavigation } from './users/users.navigation'

export const dashboardNavigationConfig: NavigationConfig = {
	sections: [
		{
			id: 'home',
			routes: [{ id: 'dashboard', name: 'DASHBOARD.BREADCRUMB', route: 'dashboard', icon: { featherHome } }],
		},
		{
			id: 'maintenance',
			name: 'DASHBOARD.SECTIONS.MAINTENANCE',
			routes: [{ id: 'health', name: 'HEALTH.NAV', route: 'dashboard/health', icon: { featherActivity } }],
		},
		{ id: 'admin', name: 'DASHBOARD.SECTIONS.ADMIN', routes: [usersNavigation, authorizationNavigation] },
	],
}
