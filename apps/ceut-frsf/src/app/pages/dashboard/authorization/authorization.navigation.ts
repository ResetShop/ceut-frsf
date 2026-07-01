import { featherShield } from '@ng-icons/feather-icons'
import type { ParentNavigationRoute } from '@resetshop/angular-core/interfaces/navigation'
import { permissionsNavigation } from '../permissions/permissions.navigation'
import { rolesNavigation } from '../roles/roles.navigation'

export const authorizationNavigation: ParentNavigationRoute = {
	id: 'authorization',
	name: 'DASHBOARD.AUTHORIZATION.NAV',
	route: 'dashboard/authorization/roles',
	icon: { featherShield },
	children: [rolesNavigation, permissionsNavigation],
}
