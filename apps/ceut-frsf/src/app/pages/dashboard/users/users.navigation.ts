import { featherUsers } from '@ng-icons/feather-icons'
import type { LeafNavigationRoute } from '@resetshop/angular-core/interfaces/navigation'

export const usersNavigation: LeafNavigationRoute = {
	id: 'users',
	name: 'USERS.PAGE.NAV',
	route: 'dashboard/users',
	icon: { featherUsers },
	permission: 'admin:users:read',
}
