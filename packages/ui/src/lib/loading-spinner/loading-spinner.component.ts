import { Component, input } from '@angular/core'

@Component({
	selector: 'app-loading-spinner',
	standalone: true,
	host: { class: 'fixed inset-0 z-50 flex items-center justify-center bg-black/95' },
	template: `
		<dialog open class="align-self-center flex justify-self-center bg-transparent">
			<div
				class="border-border bg-card flex flex-col items-center justify-center gap-6 rounded-xl border p-8 shadow-2xs sm:h-[420px] sm:w-[420px] md:p-10"
			>
				<div class="spinner relative h-[60px] w-[60px]">
					<div class="spinner-ring border-t-default border-transparent"></div>
					<div class="spinner-ring border-t-default border-transparent"></div>
					<div class="spinner-ring border-t-default border-transparent"></div>
					<div class="spinner-ring border-t-default border-transparent"></div>
				</div>
				<p class="text-muted-foreground text-center text-lg font-medium">{{ message() }}</p>
			</div>
		</dialog>
	`,
	styles: `
		.spinner-ring {
			position: absolute;
			width: 100%;
			height: 100%;
			border-width: 4px;
			border-radius: 50%;
			animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
		}

		.spinner-ring:nth-child(1) {
			animation-delay: -0.45s;
		}

		.spinner-ring:nth-child(2) {
			animation-delay: -0.3s;
		}

		.spinner-ring:nth-child(3) {
			animation-delay: -0.15s;
		}

		@keyframes spin {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
	`,
})
export class LoadingSpinnerComponent {
	/** Loading message displayed under the spinner. Defaults to English. Forks may pass a translated string. */
	public readonly message = input<string>('Loading...')
}
