import { Component, computed, input } from '@angular/core'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: 'span[appBadge]',
	standalone: true,
	template: `
		<ng-content />
	`,
	host: {
		'[class]': 'computedClasses()',
	},
})
export class Badge {
	/**
	 * Visual variant of the badge
	 * @default 'default'
	 */
	public readonly variant = input<BadgeVariant>('default')

	private readonly baseClasses = [
		'inline-flex',
		'items-center',
		'rounded-full',
		'border',
		'px-2.5',
		'py-0.5',
		'text-xs',
		'font-semibold',
		'transition-colors',
		'duration-300',
		'ease-in-out',
	]

	/**
	 * Computed classes based on variant
	 */
	protected readonly computedClasses = computed(() => {
		const variantClasses: Record<BadgeVariant, string[]> = {
			default: ['bg-default', 'border-transparent', 'text-default-foreground'],
			secondary: ['bg-secondary', 'border-transparent', 'text-secondary-foreground'],
			destructive: ['bg-destructive/10', 'border-transparent', 'text-destructive', 'dark:bg-destructive/20'],
			outline: ['border-border', 'text-foreground'],
		}

		return [...this.baseClasses, ...variantClasses[this.variant()]].join(' ')
	})
}
