import { Component, input } from '@angular/core'

/**
 * A rounded tile showing a person's initials.
 *
 * Decorative: it is hidden from assistive technology, so render it next to the person's name or
 * inside a control whose accessible name identifies them.
 *
 * @example
 *   <app-avatar initials="AL" />
 */
@Component({
	selector: 'app-avatar',
	standalone: true,
	host: {
		'aria-hidden': 'true',
		class:
			'bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium uppercase select-none',
	},
	template: `
		{{ initials() }}
	`,
})
export class Avatar {
	public readonly initials = input.required<string>()
}
