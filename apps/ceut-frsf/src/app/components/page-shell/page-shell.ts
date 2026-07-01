import { ChangeDetectionStrategy, Component, computed, input, OnDestroy, signal } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherAlertCircle } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Spinner } from '@resetshop/ui/spinner/spinner'
import { parseDurationToMs } from '@resetshop/util'

@Component({
	selector: 'app-page-shell',
	standalone: true,
	imports: [Spinner, NgIcon, TranslatePipe],
	host: { '[attr.title]': 'null' },
	providers: [provideIcons({ featherAlertCircle })],
	template: `
		<div class="space-y-4 sm:space-y-6" data-testid="page-shell-wrapper">
			<div>
				<h1 class="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">{{ title() }}</h1>
				<p class="mt-1 text-sm text-gray-600 empty:hidden dark:text-gray-400">
					<ng-content select="[pageDescription]" />
				</p>
			</div>

			@if (showLoading()) {
				<ng-content select="[pageActionsSkeleton]" />
			} @else {
				<ng-content select="[pageActions]" />
			}

			@if (showLoading()) {
				<div
					class="page-shell-fade-in border-border bg-card text-muted-foreground flex flex-col items-center justify-center gap-4 rounded-lg border p-8 py-32 text-center"
					role="status"
				>
					<app-spinner class="size-8" />
					<span>{{ 'COMMON.LOADING' | translate }}</span>
				</div>
			} @else if (error()) {
				<div
					class="page-shell-fade-in border-destructive/30 bg-destructive/5 text-destructive flex flex-col items-center justify-center gap-4 rounded-lg border p-8 py-32 text-center"
					role="alert"
				>
					<ng-icon name="featherAlertCircle" size="36" />
					<p class="text-destructive/80">{{ error() }}</p>
				</div>
			} @else {
				<div class="page-shell-fade-in space-y-4 sm:space-y-6">
					<ng-content />
				</div>
			}
		</div>
	`,
	styles: `
		.page-shell-fade-in {
			animation: page-shell-fade-in 500ms ease-out;
		}

		@keyframes page-shell-fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageShell implements OnDestroy {
	public readonly title = input.required<string>()
	public readonly loading = input(true)
	public readonly error = input<string | null>(null)

	private readonly minimumElapsed = signal(false)
	private minimumTimer: ReturnType<typeof setTimeout> | null = null

	protected readonly showLoading = computed(() => this.loading() || !this.minimumElapsed())

	constructor() {
		const PAGE_SHELL_MIN_DISPLAY = '1s'
		this.minimumTimer = setTimeout(() => this.minimumElapsed.set(true), parseDurationToMs(PAGE_SHELL_MIN_DISPLAY))
	}

	public ngOnDestroy(): void {
		if (this.minimumTimer) {
			clearTimeout(this.minimumTimer)
			this.minimumTimer = null
		}
	}
}
