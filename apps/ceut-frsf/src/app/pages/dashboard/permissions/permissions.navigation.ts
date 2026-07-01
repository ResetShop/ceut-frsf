import type { LeafNavigationRoute } from '@resetshop/angular-core/interfaces/navigation'

export const permissionsNavigation: LeafNavigationRoute = {
	id: 'permissions',
	name: 'PERMISSIONS.PAGE.NAV',
	route: 'dashboard/authorization/permissions',
	permission: 'admin:permissions:read',
}
