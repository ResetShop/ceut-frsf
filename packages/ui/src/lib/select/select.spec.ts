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
import { Select } from './select'
import type { SelectOption } from './select-option'

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
	selector: 'app-test-select-host',
	standalone: true,
	imports: [FormField, SignalFormField, Select],
	template: `
		<app-form-field [label]="'Country'">
			<app-select
				[formField]="field"
				[options]="options()"
				[placeholder]="'Select a country'"
				[isDisabled]="disabled()"
			/>
		</app-form-field>
	`,
})
class TestSelectHost {
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

function renderSelect() {
	return render(TestSelectHost, {
		providers: [{ provide: Translation, useValue: mockTranslation }, ...provideSignalFormsConfig({})],
	})
}

describe('Select', () => {
	beforeEach(() => {
		clearAllMocks()
	})

	it('should render placeholder when no value is selected', async () => {
		await renderSelect()

		expect(screen.getByText('Select a country')).toBeInTheDocument()
	})

	it('should render the select trigger with combobox role', async () => {
		await renderSelect()

		expect(screen.getByRole('combobox')).toBeInTheDocument()
	})

	it('should show required asterisk via FormField', async () => {
		await renderSelect()

		expect(screen.getByText('*')).toBeInTheDocument()
	})

	it('should render label text', async () => {
		await renderSelect()

		expect(screen.getByText('Country')).toBeInTheDocument()
	})

	it('should show validation error when touched and empty', async () => {
		const { fixture } = await renderSelect()

		fixture.componentInstance.field().markAsTouched()
		fixture.detectChanges()
		await fixture.whenStable()

		expect(screen.getByRole('alert')).toHaveTextContent('This field is required')
	})

	it('should display selected label when value is set programmatically', async () => {
		const { fixture } = await renderSelect()

		fixture.componentInstance.field().value.set('uk')
		fixture.detectChanges()
		await fixture.whenStable()

		expect(screen.getByText('United Kingdom')).toBeInTheDocument()
	})

	it('should apply max-h-[min(60vh,240px)] to the dropdown when open', async () => {
		// jsdom cannot evaluate min() or vh units; class-presence asserts the responsive
		// max-height rule. Visual behaviour is covered by the `MobileViewport` Storybook story.
		await renderSelect()

		await userEvent.setup().click(screen.getByRole('combobox'))

		const dropdown = screen.getByTestId('select-dropdown')
		expect(dropdown).toHaveClass('max-h-[min(60vh,240px)]')
	})

	it('should emit touch when the dropdown closes after selecting an option', async () => {
		const user = userEvent.setup()
		const onTouch = fn<[], void>()
		await render(`<app-select [options]="options" [placeholder]="'Select a country'" (touch)="onTouch()" />`, {
			imports: [Select],
			componentProperties: { options: TEST_OPTIONS, onTouch },
		})

		await user.click(screen.getByRole('combobox'))
		await user.click(screen.getByText('United Kingdom'))

		// Selecting an option closes the dropdown (onOpenChange(false)) and moves focus off the
		// host, so both the open-state and focusout paths can independently emit `touch`; either
		// is sufficient proof the emission fires from real interaction, not markAsTouched().
		expect(onTouch.calls.length).toBeGreaterThan(0)
	})
})
