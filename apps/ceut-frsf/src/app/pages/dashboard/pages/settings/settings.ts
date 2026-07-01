import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { form, schema, FormField as SignalFormField } from '@angular/forms/signals'
import { PageShell } from '@components/page-shell/page-shell'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { type Language, Translation } from '@resetshop/angular-core/i18n/translation'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { Select } from '@resetshop/ui/select/select'
import type { SelectOption } from '@resetshop/ui/select/select-option'

interface SettingsForm {
	language: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-function -- signal forms requires a schema callback even when no validators are needed
const noValidation = schema<SettingsForm>(() => {})

@Component({
	selector: 'app-settings',
	imports: [PageShell, TranslatePipe, FormField, SignalFormField, Select],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-page-shell [title]="'SETTINGS.TITLE' | translate" [loading]="false">
			<p pageDescription>{{ 'SETTINGS.DESCRIPTION' | translate }}</p>

			<div class="max-w-md space-y-6">
				<app-form-field [label]="'SETTINGS.LANGUAGE.LABEL' | translate">
					<app-select [formField]="settingsForm.language" [options]="languageOptions()" />
				</app-form-field>
			</div>
		</app-page-shell>
	`,
})
export default class Settings {
	protected readonly translation = inject(Translation)

	private readonly model = signal<SettingsForm>({ language: this.translation.currentLanguage() })
	protected readonly settingsForm = form(this.model, noValidation)

	protected readonly languageOptions = computed<SelectOption[]>(() => [
		{ value: 'en', label: this.translation.instant('SETTINGS.LANGUAGE.ENGLISH') },
		{ value: 'es', label: this.translation.instant('SETTINGS.LANGUAGE.SPANISH') },
	])

	protected readonly syncLanguageEffect = effect(() => {
		const lang = this.model().language
		untracked(() => {
			if (lang !== this.translation.currentLanguage()) {
				void this.translation.setLanguage(lang as Language)
			}
		})
	})
}
