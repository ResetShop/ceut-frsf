import { Injectable, makeEnvironmentProviders } from '@angular/core'
import { Analytics } from './analytics'

@Injectable({ providedIn: 'root' })
export class AnalyticsMock extends Analytics {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public override async init() {}
}

export function provideAnalyticsMock() {
	return makeEnvironmentProviders([{ provide: Analytics, useClass: AnalyticsMock }])
}
