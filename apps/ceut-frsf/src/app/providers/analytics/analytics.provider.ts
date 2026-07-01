import { makeEnvironmentProviders } from '@angular/core'
import { Analytics } from './analytics'

export function provideAnalytics() {
	return makeEnvironmentProviders([Analytics])
}
