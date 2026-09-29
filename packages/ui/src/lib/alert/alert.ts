import { Component, computed, input } from '@angular/core'

export type AlertVariant = 'default' | 'destructive'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: 'div[appAlert]',
	standalone: true,
	template: `
		<ng-content />
	`,
	host: {
		'[attr.role]': 'role()',
		'[class]': 'computedClasses()',
	},
})
export class Alert {
	public readonly variant = input<AlertVariant>('default')

	private readonly variantClasses: Record<AlertVariant, string[]> = {
		default: ['bg-card', 'text-card-foreground'],
		destructive: ['text-destructive', 'bg-card', '[&_[data-slot=alert-description]]:text-destructive/90'],
	}

	protected readonly role = computed(() => (this.variant() === 'destructive' ? 'alert' : 'status'))

	protected readonly computedClasses = computed(() => {
		const baseClasses = [
			'relative',
			'grid',
			'gap-0.5',
			'rounded-lg',
			'border',
			'px-2.5',
			'py-2',
			'text-left',
			'text-sm',
			'[&>svg]:size-4',
			'[&>svg]:translate-y-0.5',
			'[&>svg]:text-current',
			'has-[>svg]:grid-cols-[auto_1fr]',
			'has-[>svg]:gap-x-2',
			'[&>svg]:row-span-2',
		]

		return [...baseClasses, ...this.variantClasses[this.variant()]].join(' ')
	})
}

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appAlertTitle]',
	standalone: true,
	template: `
		<ng-content />
	`,
	host: {
		'[attr.data-slot]': '"alert-title"',
		class: 'font-medium group-has-[>svg]/alert:col-start-2',
	},
})
export class AlertTitle {}

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: '[appAlertDescription]',
	standalone: true,
	template: `
		<ng-content />
	`,
	host: {
		'[attr.data-slot]': '"alert-description"',
		class: 'text-muted-foreground text-sm [&_p:not(:last-child)]:mb-4',
	},
})
export class AlertDescription {}
