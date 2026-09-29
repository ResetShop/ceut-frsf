import { Component, computed, ElementRef, forwardRef, inject, input, model, output, signal } from '@angular/core'
import type { FormValueControl } from '@angular/forms/signals'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronDown } from '@ng-icons/feather-icons'
import {
	NgpCombobox,
	NgpComboboxButton,
	NgpComboboxDropdown,
	NgpComboboxInput,
	NgpComboboxOption,
	NgpComboboxPortal,
} from 'ng-primitives/combobox'
import { FormFieldCustomControl } from '../form-field/form-field-custom-control'
import type { SelectOption } from '../select/select-option'

@Component({
	selector: 'app-combobox',
	standalone: true,
	imports: [
		NgpCombobox,
		NgpComboboxButton,
		NgpComboboxDropdown,
		NgpComboboxInput,
		NgpComboboxOption,
		NgpComboboxPortal,
		NgIcon,
	],
	providers: [
		provideIcons({ featherChevronDown }),
		{ provide: FormFieldCustomControl, useExisting: forwardRef(() => Combobox) },
	],
	template: `
		<div
			(ngpComboboxValueChange)="onValueChange($event)"
			(ngpComboboxOpenChange)="onOpenChange($event)"
			(focusout)="onFocusOut()"
			[(ngpComboboxValue)]="value"
			[ngpComboboxDisabled]="isDisabled()"
			[attr.aria-disabled]="isDisabled() || null"
			[class]="triggerClasses()"
			ngpCombobox
		>
			<input (input)="onFilterChange($event)" [value]="filter()" [placeholder]="placeholder()" ngpComboboxInput />
			<button ngpComboboxButton aria-label="Toggle dropdown">
				<ng-icon name="featherChevronDown" size="16" />
			</button>

			<div *ngpComboboxPortal ngpComboboxDropdown>
				@for (option of filteredOptions(); track option.value) {
					<div [ngpComboboxOptionValue]="option.value" ngpComboboxOption>
						{{ option.label }}
					</div>
				} @empty {
					<div class="text-muted-foreground px-3 py-2 text-center text-sm">No options found</div>
				}
			</div>
		</div>
	`,
	styleUrl: './combobox.css',
})
export class Combobox extends FormFieldCustomControl implements FormValueControl<string> {
	private readonly host = inject(ElementRef).nativeElement as HTMLElement

	public readonly options = input.required<SelectOption[]>()
	public readonly value = model<string>('')
	public readonly placeholder = input<string>('')
	public readonly isDisabled = input<boolean>(false)
	public readonly touched = input<boolean>(false)
	public readonly touch = output<void>()

	protected readonly filter = signal<string>('')

	protected readonly filteredOptions = computed(() => {
		const query = this.filter().toLowerCase()
		if (!query) return this.options()
		return this.options().filter((o) => o.label.toLowerCase().includes(query))
	})

	protected readonly triggerClasses = computed(() => {
		return this.ariaInvalid() ? 'invalid' : ''
	})

	protected onFilterChange(event: Event): void {
		const input = event.target as HTMLInputElement
		this.filter.set(input.value)
	}

	protected onValueChange(value: string): void {
		const label = this.options().find((o) => o.value === value)?.label ?? ''
		this.filter.set(label)
	}

	protected onOpenChange(open: boolean): void {
		if (!open) {
			const current = this.value()
			const label = current ? (this.options().find((o) => o.value === current)?.label ?? '') : ''
			this.filter.set(label)
			this.touch.emit()
		}
	}

	protected onFocusOut(): void {
		// Deferred check: the browser needs a tick to settle the new activeElement
		// after focusout fires, so we can verify focus truly left the component.
		setTimeout(() => {
			if (!this.host.contains(document.activeElement)) {
				this.touch.emit()
			}
		})
	}
}
