import { makeEnvironmentProviders } from '@angular/core'
import { HttpRolesApi } from './roles'
import { RolesApi } from './roles.interface'

export function provideRoles() {
	return makeEnvironmentProviders([{ provide: RolesApi, useExisting: HttpRolesApi }])
}
