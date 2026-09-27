import { NgTemplateOutlet } from '@angular/common'
import {
	afterRenderEffect,
	Component,
	computed,
	contentChild,
	ElementRef,
	ErrorHandler,
	inject,
	input,
	signal,
	TemplateRef,
	viewChild,
} from '@angular/core'
import type { ValidationError } from '@angular/forms/signals'
import { NgValidationError, REQUIRED, FormField as SignalFormField } from '@angular/forms/signals'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { NgpFormField } from 'ng-primitives/form-field'
import { FormFieldCustomControl } from './form-field-custom-control'

@Component({
	selector: 'app-form-field',
	standalone: true,
	imports: [NgTemplateOutlet],
	hostDirectives: [NgpFormField],
	host: { class: 'block' },
	template: `
		<ng-template #projectedContent>
			<ng-content />
		</ng-template>

		<!--	Checkbox styles are handled differently to position the label right to the input -->
		@if (isCheckbox()) {
			<div class="flex items-center gap-3">
				<div class="order-1 flex items-center" #contentWrapper>
					<ng-container *ngTemplateOutlet="projectedContent" />
				</div>
				<label [for]="resolvedId()" class="text-foreground order-2 text-sm/6 font-medium select-none">
					{{ label() }}
					@if (isRequired()) {
						<span aria-hidden="true" class="ml-0.5">*</span>
					}
				</label>
			</div>
		} @else {
			<div class="flex items-baseline justify-between">
				<label [for]="resolvedId()" class="text-foreground block text-sm/6 font-medium">
					{{ label() }}
					@if (isRequired()) {
						<span aria-hidden="true" class="ml-0.5">*</span>
					}
				</label>
				@if (labelEndTemplate()) {
					<ng-container *ngTemplateOutlet="labelEndTemplate()!" />
				}
			</div>
			<div class="mt-2" #contentWrapper>
				<ng-container *ngTemplateOutlet="projectedContent" />
			</div>
		}

		@if (hint() && !showErrors()) {
			<p class="text-muted-foreground mt-1.5 text-sm">{{ hint() }}</p>
		}

		@if (showErrors()) {
			<p role="alert" class="text-destructive mt-1.5 text-sm">
				{{ translatedError() }}
			</p>
		}
	`,
	styles: `
		:host ::ng-deep input:not([type='checkbox']),
		:host ::ng-deep select,
		:host ::ng-deep textarea {
			/* text-base on mobile prevents iOS Safari zoom-on-focus; text-sm from sm: up restores the desktop look. */
			@apply text-foreground border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring block w-full rounded-lg border px-3 py-2 text-base shadow-sm focus:ring-1 focus:outline-none sm:text-sm;
		}

		:host ::ng-deep input[type='checkbox'] {
			@apply border-input text-default focus:ring-ring h-4 w-4 rounded;
		}

		:host ::ng-deep input[aria-invalid='true'],
		:host ::ng-deep select[aria-invalid='true'],
		:host ::ng-deep textarea[aria-invalid='true'] {
			border-color: var(--destructive);
		}

		:host ::ng-deep input:disabled,
		:host ::ng-deep select:disabled,
		:host ::ng-deep textarea:disabled {
			@apply bg-muted cursor-not-allowed opacity-60;
		}

		:host ::ng-deep input[type='date'] {
			color-scheme: light;
		}

		:host-context(.dark) ::ng-deep input[type='date'] {
			color-scheme: dark;
		}
	`,
})
export class FormField {
	private readonly errorHandler = inject(ErrorHandler)
	private readonly translation = inject(Translation)
	private readonly contentWrapper = viewChild<ElementRef<HTMLElement>>('contentWrapper')
	private readonly formFieldDirective = contentChild(SignalFormField)
	private readonly customControl = contentChild(FormFieldCustomControl)

	public readonly label = input.required<string>()
	public readonly hint = input<string>()
	public readonly showRequired = input<boolean>()
	public readonly labelEndTemplate = input<TemplateRef<void>>()

	protected readonly resolvedId = signal('')
	protected readonly isCheckbox = signal(false)

	protected readonly fieldState = computed(() => this.formFieldDirective()?.state())

	protected readonly isRequired = computed(() => {
		const override = this.showRequired()
		if (override !== undefined) return override
		const state = this.fieldState()
		if (!state) return false
		const requiredSignal = state.metadata(REQUIRED)
		return requiredSignal ? requiredSignal() : false
	})

	protected readonly errors = computed(() => this.fieldState()?.errors() ?? [])

	protected readonly showErrors = computed(() => {
		const state = this.fieldState()
		if (!state) return false
		return state.touched() && this.errors().length > 0
	})

	protected readonly translatedError = computed(() => {
		const errors = this.errors()
		if (errors.length === 0) return ''
		return this.mapErrorToMessage(errors[0])
	})

	private readonly supportedNativeControls = 'input, select, textarea'

	private readonly contentSetupEffect = afterRenderEffect(() => {
		this.setupContentValidation()
		this.resolveInputComponentType()
		this.setupIdAndAriaSync()
	})

	/**
	 * This method verifies that:
	 * 1. The length of children is exactly one (i.e. only one element is projected inside an instance of form-field)
	 * 2. The single child is a supported HTML element
	 * 3. The child element has the formField directive attached
	 */
	private setupContentValidation() {
		const wrapper = this.contentWrapper()?.nativeElement
		if (!wrapper) return

		const directChildren = wrapper.children

		if (directChildren.length > 1) {
			this.errorHandler.handleError(
				new Error(`FormField expects a single projected element, but received ${directChildren.length}.`),
			)
		}

		if (directChildren.length === 1) {
			const isNativeControl = directChildren[0].matches(this.supportedNativeControls)
			const isCustomControl = !!this.customControl()

			if (!isNativeControl && !isCustomControl) {
				this.errorHandler.handleError(
					new Error(
						`FormField received an unsupported element <${directChildren[0].tagName.toLowerCase()}>. ` +
							`Supported elements: ${this.supportedNativeControls}, or a FormFieldCustomControl provider.`,
					),
				)
			}

			if ((isNativeControl || isCustomControl) && !this.formFieldDirective()) {
				this.errorHandler.handleError(
					new Error(
						'FormField requires a [formField] directive on the projected form control. ' +
							'Add [formField]="yourField" to the element.',
					),
				)
			}
		}
	}

	private resolveInputComponentType() {
		const wrapper = this.contentWrapper()?.nativeElement
		if (!wrapper) return
		const el = wrapper.querySelector(':scope > input')
		this.isCheckbox.set(el instanceof HTMLInputElement && el.type === 'checkbox')
	}

	/**
	 * Sets up the content child id and aria-invalid attribute when the child is in an invalid status
	 */
	private setupIdAndAriaSync() {
		const wrapper = this.contentWrapper()?.nativeElement
		if (!wrapper) return

		const nativeEl = wrapper.querySelector(`:scope > ${this.supportedNativeControls}`)
		if (nativeEl) {
			let id = nativeEl.getAttribute('id')
			if (!id) {
				id = `form-field-${crypto.randomUUID().slice(0, 8)}`
				nativeEl.setAttribute('id', id)
			}
			this.resolvedId.set(id)
			nativeEl.setAttribute('aria-invalid', String(this.showErrors()))
			return
		}

		const custom = this.customControl()
		if (custom) {
			const firstChild = wrapper.children[0]
			if (firstChild) {
				let id = firstChild.getAttribute('id')
				if (!id) {
					id = `form-field-${crypto.randomUUID().slice(0, 8)}`
					firstChild.setAttribute('id', id)
				}
				this.resolvedId.set(id)
			}
			custom.ariaInvalid.set(this.showErrors())
		}
	}

	private mapErrorToMessage(error: ValidationError): string {
		if (!(error instanceof NgValidationError)) return error.message ?? error.kind

		switch (error.kind) {
			case 'required':
				return this.translation.instant('VALIDATION.REQUIRED', 'This field is required')
			case 'email':
				return this.translation.instant('VALIDATION.EMAIL', 'Please enter a valid email address')
			case 'minLength':
				return this.translation
					.instant('VALIDATION.MIN_LENGTH', 'Must be at least {min} characters')
					.replace('{min}', String(error.minLength))
			case 'maxLength':
				return this.translation
					.instant('VALIDATION.MAX_LENGTH', 'Must be no more than {max} characters')
					.replace('{max}', String(error.maxLength))
			case 'min':
				return this.translation.instant('VALIDATION.MIN', 'Must be at least {min}').replace('{min}', String(error.min))
			case 'max':
				return this.translation
					.instant('VALIDATION.MAX', 'Must be no more than {max}')
					.replace('{max}', String(error.max))
			case 'pattern':
				return this.translation.instant('VALIDATION.PATTERN', 'Invalid format')
			default:
				return error.message ?? error.kind
		}
	}
}
