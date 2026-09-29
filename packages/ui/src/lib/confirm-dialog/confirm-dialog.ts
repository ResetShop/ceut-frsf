import { Component, computed, type ElementRef, inject, input, type OnDestroy, output, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { filter, fromEvent, Subject, switchMap, take } from 'rxjs'
import { Button } from '../button/button'
import { ConfirmDialogTracker } from './confirm-dialog-tracker'

@Component({
	selector: 'app-confirm-dialog',
	standalone: true,
	imports: [Button],
	host: { '[attr.title]': 'null' },
	templateUrl: './confirm-dialog.html',
	styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog implements OnDestroy {
	/** Dialog title */
	public readonly title = input<string>('Confirm')

	/** Dialog message body */
	public readonly message = input<string>('')

	/** Text for the confirm button */
	public readonly confirmText = input<string>('Confirm')

	/** Text for the cancel button */
	public readonly cancelText = input<string>('Cancel')

	/** Variant for the confirm button */
	public readonly confirmVariant = input<'default' | 'destructive'>('default')

	/** Emits when user confirms */
	public readonly confirmed = output<void>()

	/** Emits when user cancels */
	public readonly cancelled = output<void>()

	private readonly confirmDialogTracker = inject(ConfirmDialogTracker)
	private readonly instanceId = this.confirmDialogTracker.nextId()

	/** Unique ID for aria-labelledby */
	protected readonly titleId = `confirm-dialog-title-${this.instanceId}`

	/** Unique ID for aria-describedby */
	protected readonly messageId = `confirm-dialog-message-${this.instanceId}`
	private readonly closeTransition$ = new Subject<void>()
	private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRef')
	private readonly dialogElement = computed(() => this.dialogRef().nativeElement)

	constructor() {
		this.closeTransition$
			.pipe(
				switchMap(() =>
					fromEvent(this.dialogElement(), 'transitionend').pipe(
						filter((e) => e.target === this.dialogElement()),
						take(1),
					),
				),
				takeUntilDestroyed(),
			)
			.subscribe(() => {
				this.dialogElement().close()
				this.confirmDialogTracker.unregister(this)
			})
	}

	public show(): void {
		const el = this.dialogElement()
		if (el.open) return
		this.confirmDialogTracker.register(this)
		el.showModal()
		requestAnimationFrame(() => el.setAttribute('data-open', ''))
	}

	public close(): void {
		const el = this.dialogElement()
		if (!el.open) return
		el.removeAttribute('data-open')
		this.closeTransition$.next()
	}

	public ngOnDestroy(): void {
		this.confirmDialogTracker.unregister(this)
	}

	protected onConfirm(): void {
		this.confirmed.emit()
		this.close()
	}

	protected onCancel(): void {
		this.cancelled.emit()
		this.close()
	}

	protected onDialogCancel(event: Event): void {
		event.preventDefault()
		this.onCancel()
	}
}
