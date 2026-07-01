import { makeEnvironmentProviders } from '@angular/core'
import { HttpPermissionsApi } from './permissions'
import { PermissionsApi } from './permissions.interface'

export function providePermissions() {
	return makeEnvironmentProviders([{ provide: PermissionsApi, useExisting: HttpPermissionsApi }])
}
