import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { Analytics } from '@providers/analytics/analytics'
import { AnalyticsMock } from '@providers/analytics/analytics.mock'
import { render } from '@testing-library/angular'
import { App } from './app'

describe('App', () => {
	it('should create the app component', async () => {
		const { fixture } = await render(App, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: Analytics, useClass: AnalyticsMock },
			],
		})

		expect(fixture.componentInstance).toBeTruthy()
	})
})
