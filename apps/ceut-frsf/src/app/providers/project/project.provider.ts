import { makeEnvironmentProviders } from '@angular/core'
import { PROJECT_CONFIG, type ProjectConfig } from '@resetshop/angular-core/interfaces/project'

export function provideProjectConfig(config: ProjectConfig) {
	return makeEnvironmentProviders([{ provide: PROJECT_CONFIG, useValue: config }])
}

export function provideProjectConfigTesting() {
	return makeEnvironmentProviders([
		{ provide: PROJECT_CONFIG, useValue: { applicationName: 'Testing app' } satisfies ProjectConfig },
	])
}
