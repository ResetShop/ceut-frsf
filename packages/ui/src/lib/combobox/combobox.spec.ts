import { Component, signal } from '@angular/core'
import {
	form,
	provideSignalFormsConfig,
	required,
	schema,
	FormField as SignalFormField,
	type FieldTree,
} from '@angular/forms/signals'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { FormField } from '../form-field/form-field'
import type { SelectOption } from '../select/select-option'
import { Combobox } from './combobox'

const TRANSLATIONS: Record<string, string> = {
	'VALIDATION.REQUIRED': 'This field is required',
}

const mockTranslation = {
	instant: (key: string) => TRANSLATIONS[key] ?? key,
}

const TEST_OPTIONS: SelectOption[] = [
	{ value: 'us', label: 'United States' },
	{ value: 'uk', label: 'United Kingdom' },
	{ value: 'ca', label: 'Canada' },
]

@Component({
	selector: 'app-test-combobox-host',
	standalone: true,
	imports: [FormField, SignalFormField, Combobox],
	template: `
		<app-form-field [label]="'Country'">
			<app-combobox
				[formField]="field"
				[options]="options()"
				[placeholder]="'Search a country'"
				[isDisabled]="disabled()"
			/>
		</app-form-field>
	`,
})
class TestComboboxHost {
	public readonly options = signal<SelectOption[]>(TEST_OPTIONS)
	public readonly disabled = signal(false)

	private readonly model = signal('')
	public readonly field: FieldTree<string> = form(
		this.model,
		schema<string>((path) => {
			required(path)
		}),
	)
}

function renderCombobox() {
	return render(TestComboboxHost, {
		providers: [{ provide: Translation, useValue: mockTranslation }, ...provideSignalFormsConfig({})],
	})
}

describe('Combobox', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	it('should render placeholder in input when no value', async () => {
		await renderCombobox()

		expect(screen.getByPlaceholderText('Search a country')).toBeInTheDocument()
	})

	it('should render the combobox input with combobox role', async () => {
		await renderCombobox()

		expect(screen.getByRole('combobox')).toBeInTheDocument()
	})

	it('should render the toggle button', async () => {
		await renderCombobox()

		expect(screen.getByRole('button', { name: /toggle dropdown/i })).toBeInTheDocument()
	})

	it('should show required asterisk via FormField', async () => {
		await renderCombobox()

		expect(screen.getByText('*')).toBeInTheDocument()
	})

	it('should render label text', async () => {
		await renderCombobox()

		expect(screen.getByText('Country')).toBeInTheDocument()
	})

	it('should show validation error when touched and empty', async () => {
		const { fixture } = await renderCombobox()

		fixture.componentInstance.field().markAsTouched()
		fixture.detectChanges()
		await fixture.whenStable()

		expect(screen.getByRole('alert')).toHaveTextContent('This field is required')
	})

	it('should emit touch when the dropdown closes after selecting an option', async () => {
		const user = userEvent.setup()
		const onTouch = fn<[], void>()
		await render(`<app-combobox [options]="options" [placeholder]="'Search a country'" (touch)="onTouch()" />`, {
			imports: [Combobox],
			componentProperties: { options: TEST_OPTIONS, onTouch },
		})

		await user.click(screen.getByRole('button', { name: /toggle dropdown/i }))
		await user.click(screen.getByText('United Kingdom'))

		// Selecting an option closes the dropdown (onOpenChange(false)) and moves focus off the
		// host, so both the open-state and focusout paths can independently emit `touch`; either
		// is sufficient proof the emission fires from real interaction, not markAsTouched().
		expect(onTouch.calls.length).toBeGreaterThan(0)
	})
})
