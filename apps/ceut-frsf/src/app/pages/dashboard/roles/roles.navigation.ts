import type { LeafNavigationRoute } from '@resetshop/angular-core/interfaces/navigation'

export const rolesNavigation: LeafNavigationRoute = {
	id: 'roles',
	name: 'ROLES.PAGE.NAV',
	route: 'dashboard/authorization/roles',
	permission: 'admin:roles:read',
}
