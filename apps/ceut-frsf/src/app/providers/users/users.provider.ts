import { makeEnvironmentProviders } from '@angular/core'
import { HttpUsersApi } from './users'
import { UsersApi } from './users.interface'

export function provideUsers() {
	return makeEnvironmentProviders([{ provide: UsersApi, useExisting: HttpUsersApi }])
}
