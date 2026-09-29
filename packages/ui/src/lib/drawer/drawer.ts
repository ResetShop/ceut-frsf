import { NgTemplateOutlet } from '@angular/common'
import {
	Component,
	computed,
	contentChild,
	ElementRef,
	inject,
	input,
	OnDestroy,
	output,
	viewChild,
} from '@angular/core'
import { Spinner } from '../spinner/spinner'
import { DrawerFooter } from './drawer-footer'
import { DrawerHeader } from './drawer-header'
import { DrawerLoading } from './drawer-loading'
import { DrawerPanel } from './drawer-panel'
import { DrawerTracker } from './drawer-tracker'
import { DrawerTransition } from './drawer-transition'

export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom'

@Component({
	selector: 'app-drawer',
	standalone: true,
	imports: [NgTemplateOutlet, Spinner],
	host: { '[attr.title]': 'null' },
	hostDirectives: [DrawerLoading, DrawerTransition, { directive: DrawerPanel, inputs: ['direction'] }],
	templateUrl: './drawer.html',
	styleUrl: './drawer.css',
})
export class Drawer implements OnDestroy {
	public readonly title = input<string>('')
	public readonly description = input<string>('')
	public readonly closeOnBackdrop = input(true)
	public readonly closeOnEscape = input(true)

	public readonly opened = output<void>()
	public readonly closed = output<void>()
	public readonly afterClosed = output<void>()

	private readonly drawerRef = viewChild.required<ElementRef<HTMLDialogElement>>('drawerRef')
	private readonly drawerElement = computed(() => this.drawerRef().nativeElement)

	protected readonly headerTemplate = contentChild(DrawerHeader)
	protected readonly footerTemplate = contentChild(DrawerFooter)

	private readonly drawerTracker = inject(DrawerTracker)
	private readonly instanceId = this.drawerTracker.nextId()

	private readonly loading = inject(DrawerLoading)
	private readonly transition = inject(DrawerTransition)
	private readonly panel = inject(DrawerPanel)

	public readonly showSpinner = this.loading.showSpinner
	protected readonly panelClasses = this.panel.panelClasses

	protected readonly titleId = `drawer-title-${this.instanceId}`
	protected readonly descriptionId = `drawer-desc-${this.instanceId}`

	public ngOnDestroy(): void {
		this.drawerTracker.unregister(this)
	}

	/**
	 * Opens the drawer with a loading spinner. The spinner stays visible until both
	 * the 500ms minimum has elapsed AND `setContentReady()` is called.
	 * For immediate content, call `setContentReady()` right after `show()`.
	 */
	public show(): void {
		const drawer = this.drawerElement()
		if (drawer.open) return

		this.loading.start()
		this.drawerTracker.register(this)
		this.transition.open(drawer)
		this.opened.emit()
	}

	public close(): void {
		const drawer = this.drawerElement()
		if (!drawer.open) return

		this.loading.reset()
		this.drawerTracker.unregister(this)
		this.transition.close(drawer, () => this.afterClosed.emit())
		this.closed.emit()
	}

	protected onCancel(event: Event): void {
		if (!this.closeOnEscape()) {
			event.preventDefault()
			return
		}
		this.close()
	}

	protected onBackdropClick(event: MouseEvent): void {
		if (!this.closeOnBackdrop()) return
		if (event.target === this.drawerElement()) {
			this.close()
		}
	}

	/** Signals that the consumer's async content is ready to display */
	public setContentReady(): void {
		this.loading.setContentReady()
	}
}
