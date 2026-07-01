import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http'
import { HttpErrorResponse, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideTranslationMock } from '@providers/i18n/translation.mock'
import type { Decorator, Meta, StoryObj } from '@storybook/angular'
import { applicationConfig } from '@storybook/angular'
import { NEVER, type Observable, of, throwError } from 'rxjs'
import Health from './health'

const HEALTH_ENDPOINT = '/api/health/v1'

const healthyFixture = {
	status: 'healthy',
	timestamp: '2026-02-11T12:37:33.993Z',
	checks: {
		database: { status: 'healthy', responseTimeMs: 298 },
	},
}

const unhealthyFixture = {
	status: 'unhealthy',
	timestamp: '2026-02-11T12:37:33.993Z',
	checks: {
		database: { status: 'unhealthy', responseTimeMs: null, error: 'Connection refused' },
	},
}

/**
 * Builds an HttpInterceptorFn that short-circuits the health endpoint with a
 * pre-canned stream, leaving all other requests untouched. Keeps each story
 * self-contained without an HttpTestingController to flush.
 */
function healthInterceptor(response: Observable<HttpEvent<unknown>>): HttpInterceptorFn {
	return (req, next) => (req.url === HEALTH_ENDPOINT ? response : next(req))
}

function storyDecorators(response: Observable<HttpEvent<unknown>>): Decorator[] {
	return [
		applicationConfig({
			providers: [provideTranslationMock(), provideHttpClient(withInterceptors([healthInterceptor(response)]))],
		}),
	]
}

// Health has no public inputs; it fetches data internally via rxResource, so there is no argTypes block.
const meta: Meta<Health> = {
	component: Health,
	title: 'Pages/Dashboard/Health',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
The Application Health Checker page mounted in the dashboard. It fetches \`${HEALTH_ENDPOINT}\` and renders the overall status panel and the per-service (database) checks panel.

Both inner panels use the \`bg-muted\` token and the outer box uses \`border-border\`, so they adapt to light and dark mode. Switch the toolbar background to **dark** to verify the panels render correctly against the dark theme.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta

type Story = StoryObj<Health>

/** Request in flight — the page shows the "Loading..." placeholder while the resource resolves. */
export const Loading: Story = {
	decorators: storyDecorators(NEVER),
}

/** Healthy response — both the overall status and database panels show "healthy" badges. */
export const Healthy: Story = {
	decorators: storyDecorators(of(new HttpResponse({ body: healthyFixture }))),
}

/** Unhealthy response — "unhealthy" badges plus the destructive alert with the database error inside the checks panel. */
export const Unhealthy: Story = {
	decorators: storyDecorators(of(new HttpResponse({ body: unhealthyFixture }))),
}

/** Endpoint failure — the resource errors and the page renders the top-level destructive alert. */
export const ApiError: Story = {
	decorators: storyDecorators(
		throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable', url: HEALTH_ENDPOINT })),
	),
}
