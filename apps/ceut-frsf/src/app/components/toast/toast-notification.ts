import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import {
	featherAlertTriangle,
	featherCheckCircle,
	featherInfo,
	featherX,
	featherXCircle,
} from '@ng-icons/feather-icons'
import { UIStore } from '@store/ui/ui.store'
import type { NotificationType, UINotification } from '@store/ui/ui.types'
import { injectToastContext, NgpToast, NgpToastManager } from 'ng-primitives/toast'

/**
 * Toast notification rendered programmatically by ng-primitives' `NgpToastManager.show()`.
 *
 * ## Why this component has no unit test
 *
 * `ToastNotification` reads its payload (id/type/message) via `injectToastContext()`,
 * which depends on the `NgpToastContext` injection token. That token is not exported
 * from ng-primitives' public API — it is only provided when the component is rendered
 * via `NgpToastManager.show()`. As a result, `TestBed` cannot wire the context without
 * reaching into ng-primitives' compiled internals.
 *
 * The available workaround is an in-spec harness component that injects the real
 * `NgpToastManager` and calls `show(ToastNotification, { context })`, then queries the
 * portal-rendered host from `document.body`. That harness was evaluated and rejected
 * for this component:
 *
 * - The responsive-width binding (`w-[min(350px,calc(100vw-2rem))]`) is a literal
 *   string in the `hostClasses()` computed signal. A class-presence assertion would
 *   re-state a constant, not validate dynamic logic.
 * - The actual responsive behaviour (the CSS `min()` function) cannot be evaluated
 *   in jsdom — only a real browser can. Class-presence alone does not catch a
 *   broken visual outcome.
 * - The harness adds portal queries, `document.body` lookups, flush timing, and
 *   manual node cleanup — infrastructure cost out of proportion to the regression
 *   signal it would provide.
 *
 * ## Where this component IS covered
 *
 * The `MobileViewport` story in `toast-notification.stories.ts` renders the toast at
 * a 375 px viewport and visually verifies that the width is capped at
 * `min(350px, 100vw - 2rem)`, leaving a 1 rem margin on each side. Storybook is the
 * canonical regression guard for this CSS-only concern.
 *
 * ## When to revisit
 *
 * - If ng-primitives exports `provideToastContext` (or an equivalent public test
 *   helper), wire it directly in a `TestBed` and add per-`NotificationType` specs.
 * - If `hostClasses()` evolves to combine the width class with non-trivial dynamic
 *   logic, the harness pattern becomes worth its cost and should be adopted then.
 */
@Component({
	selector: 'app-toast-notification',
	hostDirectives: [NgpToast],
	imports: [NgIcon],
	providers: [provideIcons({ featherCheckCircle, featherXCircle, featherAlertTriangle, featherInfo, featherX })],
	template: `
		<ng-icon [name]="icon()" class="size-4 shrink-0" />
		<p class="toast-message">{{ notification.message }}</p>
		<button (click)="dismiss()" class="toast-dismiss" aria-label="Dismiss notification">
			<ng-icon name="featherX" class="size-3.5" />
		</button>
	`,
	host: {
		'[class]': 'hostClasses()',
		'animate.enter': 'toast-enter',
		'animate.leave': 'toast-leave',
	},
	styleUrl: './toast-notification.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastNotification {
	protected readonly notification = injectToastContext<UINotification>()
	private readonly uiStore = inject(UIStore)
	private readonly toast = inject(NgpToast)
	private readonly manager = inject(NgpToastManager)

	private readonly iconMap: Record<NotificationType, string> = {
		success: 'featherCheckCircle',
		error: 'featherXCircle',
		warning: 'featherAlertTriangle',
		info: 'featherInfo',
	}

	private readonly styleMap: Record<NotificationType, string> = {
		success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
		error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
		warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
		info: 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
	}

	protected readonly icon = computed(() => this.iconMap[this.notification.type])

	protected readonly hostClasses = computed(() =>
		`w-[min(350px,calc(100vw-2rem))] ${this.styleMap[this.notification.type]}`.trim(),
	)

	protected dismiss(): void {
		this.uiStore.dismissNotification(this.notification.id)
		void this.manager.dismiss(this.toast)
	}
}
