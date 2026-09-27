import { Component, input, output, viewChild } from '@angular/core'
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog'

/** One changed field, with display-ready (already translated/formatted) before and after values. */
export interface ConfirmChangesEntry {
	readonly label: string
	readonly before: string
	readonly after: string
}

/**
 * A confirmation dialog that lists pending changes as before → after rows and asks the user to
 * confirm them before they are persisted. It composes `ConfirmDialog` (native `<dialog>`, stacking,
 * ESC-to-cancel, animation) and only adds the change list.
 *
 * The caller owns translation: every string — the dialog texts, the screen-reader prefixes, and each
 * row's label and values — arrives already resolved through an input, so the component renders
 * identically with or without a translation provider. The input defaults are English, which keeps
 * Storybook and untranslated hosts readable but means an omitted input shows English rather than
 * failing loudly; pass all of them from a translated host.
 */
@Component({
	selector: 'app-confirm-changes-dialog',
	standalone: true,
	imports: [ConfirmDialog],
	host: { '[attr.title]': 'null' },
	template: `
		<app-confirm-dialog
			(confirmed)="confirmed.emit()"
			(cancelled)="cancelled.emit()"
			[title]="title()"
			[message]="message()"
			[confirmText]="confirmText()"
			[cancelText]="cancelText()"
		>
			<dl class="mt-4 flex max-h-[50vh] flex-col gap-3 overflow-y-auto text-sm">
				@for (change of changes(); track $index) {
					<div class="rounded-md border border-gray-200 p-3 dark:border-gray-700">
						<dt class="font-medium text-gray-900 dark:text-white">{{ change.label }}</dt>
						<dd class="mt-1 flex flex-wrap items-center gap-2">
							<span class="text-gray-500 line-through dark:text-gray-400">
								<span class="sr-only">{{ beforeLabel() }}:</span>
								{{ change.before }}
							</span>
							<span aria-hidden="true" class="text-gray-400">→</span>
							<span class="font-medium text-gray-900 dark:text-white">
								<span class="sr-only">{{ afterLabel() }}:</span>
								{{ change.after }}
							</span>
						</dd>
					</div>
				}
			</dl>
		</app-confirm-dialog>
	`,
})
export class ConfirmChangesDialog {
	/** Dialog title */
	public readonly title = input<string>('Confirm changes')

	/** Short explanation rendered above the change list */
	public readonly message = input<string>('')

	/** The changes to review, one row per changed field */
	public readonly changes = input.required<readonly ConfirmChangesEntry[]>()

	/** Screen-reader prefix for the previous value */
	public readonly beforeLabel = input<string>('Before')

	/** Screen-reader prefix for the new value */
	public readonly afterLabel = input<string>('After')

	/** Text for the confirm button */
	public readonly confirmText = input<string>('Confirm')

	/** Text for the cancel button */
	public readonly cancelText = input<string>('Cancel')

	/** Emits when the user confirms the changes */
	public readonly confirmed = output<void>()

	/** Emits when the user cancels */
	public readonly cancelled = output<void>()

	private readonly dialog = viewChild.required(ConfirmDialog)

	public show(): void {
		this.dialog().show()
	}

	public close(): void {
		this.dialog().close()
	}
}
