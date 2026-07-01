import { Injectable } from '@angular/core'
// TODO: Uncomment if you're using Vercel Speed Insights, after installing the @vercel/speed-insights package
// import { injectSpeedInsights } from '@vercel/speed-insights';
import { environment } from '../../environments/environment'

@Injectable({
	providedIn: 'root',
})
export class Analytics {
	public async init() {
		// TODO: Uncomment if you're using Vercel Speed Insights
		try {
			// injectSpeedInsights();
		} catch (error) {
			console.error('Failed to initialize Speed Insights:', error)
		}

		if (!environment.clarityProjectId) {
			return
		}

		// TODO: Uncomment if you're using Clarity analytics, after installing the @microsoft/clarity package and setting the build-time __ENV_CLARITY_PROJECT_ID__ define in project.json (see README → Analytics Integration). For backend Clarity calls, see packages/hono-core/src/lib/clarity-connector.ts.
		try {
			// const clarityModule = await import('@microsoft/clarity');
			// const clarity = clarityModule.default;
			// clarity.init(environment.clarityProjectId);
		} catch (error) {
			console.error('Failed to initialize Clarity:', error)
		}
	}
}
