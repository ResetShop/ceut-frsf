import { DatePipe } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Alert, AlertDescription, AlertTitle } from '@resetshop/ui/alert/alert'
import { Badge } from '@resetshop/ui/badge/badge'

interface DatabaseCheck {
	readonly status: 'healthy' | 'unhealthy'
	readonly responseTimeMs: number | null
	readonly error?: string
}

interface HealthApiResponse {
	readonly status: string
	readonly timestamp: string
	readonly checks: {
		readonly database: DatabaseCheck
	}
}

@Component({
	selector: 'app-health',
	imports: [Alert, AlertDescription, AlertTitle, DatePipe, Badge, TranslatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="border-border rounded-md border p-5">
			<header class="mb-2">
				<h1 class="text-lg font-bold">{{ 'HEALTH.TITLE' | translate }}</h1>
			</header>
			@if (healthResource.isLoading()) {
				<p>{{ 'HEALTH.LOADING' | translate }}</p>
			} @else if (healthResource.error()) {
				<div appAlert variant="destructive">
					<h5 appAlertTitle>{{ 'HEALTH.ERROR_TITLE' | translate }}</h5>
					<p appAlertDescription>{{ healthResource.error()?.message }}</p>
				</div>
			} @else if (healthResource.value(); as data) {
				<div class="bg-muted mb-4 rounded-sm p-4">
					<p class="mb-2 flex items-center gap-1">
						<strong>{{ 'HEALTH.STATUS_LABEL' | translate }}</strong>
						<span [variant]="data.status === 'healthy' ? 'default' : 'destructive'" appBadge>
							{{ data.status }}
						</span>
					</p>
					<p class="mb-2">
						<strong>{{ 'HEALTH.DATE_TIME_LABEL' | translate }}</strong>
						{{ data.timestamp | date: 'yyyy/MM/dd HH:mm (z)' }}
					</p>
				</div>
				<h2 class="mb-2 text-base font-semibold">{{ 'HEALTH.CHECKS_HEADER' | translate }}</h2>
				<div class="bg-muted rounded-sm p-4">
					<h3 class="mb-2 font-medium">{{ 'HEALTH.DATABASE.HEADER' | translate }}</h3>
					<p class="mb-2 flex items-center gap-1">
						<strong>{{ 'HEALTH.DATABASE.STATUS' | translate }}</strong>
						<span [variant]="data.checks.database.status === 'healthy' ? 'default' : 'destructive'" appBadge>
							{{ data.checks.database.status }}
						</span>
					</p>
					@if (data.checks.database.responseTimeMs !== null) {
						<p class="mb-2">
							<strong>{{ 'HEALTH.DATABASE.RESPONSE_TIME' | translate }}</strong>
							{{ data.checks.database.responseTimeMs }}ms
						</p>
					}
					@if (data.checks.database.error) {
						<div appAlert variant="destructive">
							<h5 appAlertTitle>{{ 'HEALTH.ERROR_TITLE' | translate }}</h5>
							<p appAlertDescription>{{ data.checks.database.error }}</p>
						</div>
					}
				</div>
			}
		</div>
	`,
})
export default class Health {
	private readonly http = inject(HttpClient)

	protected readonly healthResource = rxResource({
		stream: () => this.http.get<HealthApiResponse>('/api/health/v1'),
	})
}
