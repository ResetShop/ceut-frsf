import { Component, computed, input } from '@angular/core'
import { NgpButton } from 'ng-primitives/button'

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

@Component({
	// eslint-disable-next-line @angular-eslint/component-selector
	selector: 'button[appButton], a[appButton]',
	standalone: true,
	hostDirectives: [{ directive: NgpButton, inputs: ['disabled'] }],
	template: `
		<ng-content select="[data-icon='start']" />
		<span [class]="labelClasses()"><ng-content /></span>
		<ng-content select="[data-icon='end']" />
	`,
	host: {
		'[class]': 'computedClasses()',
		'[attr.type]': 'type()',
	},
	styles: `
		.btn-label {
			display: inline-flex;
			align-items: center;
		}

		/* Removes the label's box from flex layout when empty (icon-only buttons),
		   so the parent's gap doesn't create extra space. Uses display:contents
		   instead of display:none because happy-dom misapplies :empty to non-empty
		   elements — display:contents is safe since it doesn't exclude the element
		   from the accessibility tree. */
		.btn-label:empty {
			display: contents;
		}

		:host ::ng-deep [data-icon] {
			display: inline-flex;
			align-items: center;
			flex-shrink: 0;
			animation: icon-enter 150ms ease-in-out;
		}

		/* Icon sizing matches button size */
		:host(.text-sm) ::ng-deep [data-icon] {
			@apply size-4;
		}
		:host(.text-base) ::ng-deep [data-icon] {
			@apply size-4;
		}
		:host(.text-lg) ::ng-deep [data-icon] {
			@apply size-6;
		}

		/* 1.5rem = size-6 (largest icon size); smaller icons are unaffected since max-width is a ceiling */
		@keyframes icon-enter {
			from {
				max-width: 0;
				opacity: 0;
				overflow: hidden;
			}
			to {
				max-width: 1.5rem;
				opacity: 1;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			:host ::ng-deep [data-icon] {
				animation: none;
			}
		}
	`,
})
export class Button {
	/**
	 * Visual variant of the button
	 * @default 'default'
	 */
	public readonly variant = input<ButtonVariant>('default')

	/**
	 * Size of the button
	 * @default 'md'
	 */
	public readonly size = input<ButtonSize>('md')

	/**
	 * Whether the button should take full width
	 * @default false
	 */
	public readonly fullWidth = input<boolean>(false)

	/**
	 * Button type attribute (only applies to button elements)
	 * @default 'button'
	 */
	public readonly type = input<'button' | 'submit' | 'reset'>('button')

	/**
	 * Computed classes based on variant, size, and fullWidth.
	 * Button padding is reduced — the label span adds its own padding
	 * so the total edge-to-text distance stays correct whether or not
	 * an icon is present (compounding padding technique).
	 */
	protected readonly computedClasses = computed(() => {
		const classes: string[] = [
			// Base classes - common to all buttons
			'font-sans',
			'inline-flex',
			'items-center',
			'justify-center',
			'rounded-lg',
			'font-medium',
			'transition-colors',
			'duration-300',
			'ease-in-out',
			'data-[focus-visible]:outline-2',
			'data-[focus-visible]:outline-offset-2',
			'disabled:pointer-events-none',
			'disabled:opacity-50',
			'cursor-pointer',
		]

		// Size classes — reduced px; the label span adds its own padding (see labelClasses)
		const sizeClasses: Record<ButtonSize, string[]> = {
			sm: ['h-8', 'px-2', 'text-sm'],
			md: ['h-10', 'px-3', 'text-base'],
			lg: ['h-12', 'px-4', 'text-lg'],
			icon: ['size-9', 'p-1', 'text-sm'],
		}
		classes.push(...sizeClasses[this.size()])

		// Variant classes
		const variantClasses: Record<ButtonVariant, string[]> = {
			default: [
				'bg-default',
				'text-default-foreground',
				'shadow',
				'data-[hover]:bg-default/90',
				'data-[focus-visible]:outline-default/90',
			],
			secondary: [
				'bg-secondary',
				'text-secondary-foreground',
				'shadow',
				'data-[hover]:bg-secondary/80',
				'data-[focus-visible]:outline-secondary',
			],
			destructive: [
				'bg-destructive',
				'text-destructive-foreground',
				'shadow',
				'data-[hover]:bg-destructive/90',
				'data-[focus-visible]:outline-destructive/90',
			],
			outline: [
				'border',
				'border-input',
				'bg-background',
				'text-foreground',
				'data-[hover]:bg-accent',
				'data-[hover]:text-accent-foreground',
				'data-[focus-visible]:outline-ring',
			],
			ghost: [
				'bg-transparent',
				'text-foreground',
				'data-[hover]:bg-accent',
				'data-[hover]:text-accent-foreground',
				'data-[focus-visible]:outline-ring',
			],
			link: [
				'bg-transparent',
				'text-default',
				'underline-offset-4',
				'data-[hover]:underline',
				'data-[focus-visible]:outline-ring',
			],
		}
		classes.push(...variantClasses[this.variant()])

		// Full width
		if (this.fullWidth()) {
			classes.push('w-full')
		}

		return classes.join(' ')
	})

	/**
	 * Computed classes for the label span — adds per-size padding
	 * that compounds with the button's own padding (see sizeClasses in computedClasses).
	 */
	protected readonly labelClasses = computed(() => {
		const labelPadding: Record<ButtonSize, string> = {
			sm: 'btn-label px-1',
			md: 'btn-label px-1',
			lg: 'btn-label px-2',
			icon: 'btn-label',
		}
		return labelPadding[this.size()]
	})
}
