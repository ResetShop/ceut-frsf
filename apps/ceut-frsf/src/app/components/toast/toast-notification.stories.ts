import { Component, inject, input } from '@angular/core'
import { Button } from '@resetshop/ui/button/button'
import { parseDurationToMs } from '@resetshop/util'
import { DEFAULT_NOTIFICATION_DURATION } from '@store/ui/ui.constants'
import type { NotificationType } from '@store/ui/ui.types'
import type { Meta, StoryObj } from '@storybook/angular'
import type { NgpToastOptions } from 'ng-primitives/toast'
import { NgpToastManager } from 'ng-primitives/toast'
import { ToastNotification } from './toast-notification'
import { DEFAULT_TOAST_OPTIONS } from './toast.config'

type ToastPlacement = NonNullable<NgpToastOptions['placement']>

/**
 * Wrapper component that triggers toast notifications via NgpToastManager directly,
 * allowing per-toast placement control from Storybook args.
 */
@Component({
	selector: 'app-toast-story',
	imports: [Button],
	template: `
		<div class="flex flex-wrap gap-2 p-6">
			<button (click)="show('success', 'Changes saved successfully.')" appButton variant="default">
				Success Toast
			</button>
			<button (click)="show('error', 'Failed to save changes.')" appButton variant="default">Error Toast</button>
			<button (click)="show('warning', 'Your session will expire in 5 minutes.')" appButton variant="default">
				Warning Toast
			</button>
			<button (click)="show('info', 'A new version is available.')" appButton variant="default">Info Toast</button>
		</div>
	`,
})
class ToastStory {
	public readonly placement = input<ToastPlacement>('bottom-center')

	private readonly toastManager = inject(NgpToastManager)

	protected show(type: NotificationType, message: string): void {
		const id = crypto.randomUUID()
		const notification = { id, type, message }

		this.toastManager.show(ToastNotification, {
			...DEFAULT_TOAST_OPTIONS,
			context: notification,
			placement: this.placement(),
			duration: parseDurationToMs(DEFAULT_NOTIFICATION_DURATION),
		})
	}
}

type Story = StoryObj<ToastStory>

const meta: Meta<ToastStory> = {
	component: ToastStory,
	title: 'Components/Toast Notification',
	tags: ['autodocs'],
	argTypes: {
		placement: {
			control: 'select',
			options: ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'],
			description: 'Position where toasts appear on the screen',
			table: {
				type: { summary: 'NgpToastPlacement' },
				defaultValue: { summary: "'bottom-center'" },
			},
		},
	},
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Toast notifications powered by ng-primitives (\`NgpToast\`) with Sonner-style shadcn design.

## Features
- Four notification types: \`success\`, \`error\`, \`warning\`, \`info\`
- Configurable placement: top/bottom + start/center/end
- Auto-dismiss after 5 seconds (configurable per notification)
- Manual dismiss via X button
- Swipe-to-dismiss gesture support
- Stacking with max 3 visible toasts
- Bridged from \`UIStore.showNotification()\` to \`NgpToastManager\` via \`ToastBridgeService\`

## Usage
\`\`\`typescript
const uiStore = inject(UIStore);
uiStore.showNotification({ type: 'success', message: 'Saved!' });
\`\`\`
				`,
			},
			canvas: { sourceState: 'shown' },
		},
	},
}

export default meta

/** Click the buttons to trigger toast notifications. Use the placement control to change position. */
export const AllVariants: Story = {
	args: { placement: 'bottom-center' },
	render: (args) => ({ props: args }),
}

/**
 * Mobile viewport (375 px) — canonical visual regression for the responsive width of
 * `ToastNotification`. The toast width is capped at `min(350px, 100vw - 2rem)`, leaving a
 * 1 rem visual margin on each side at sub-350 px viewports.
 *
 * This story is the regression guard for that behaviour because the component is not
 * unit-tested in isolation — see the JSDoc on `ToastNotification` for the full rationale.
 */
export const MobileViewport: Story = {
	args: { placement: 'bottom-center' },
	render: (args) => ({ props: args }),
	parameters: {
		docs: { canvas: { sourceState: 'shown' } },
		viewport: { defaultViewport: 'mobile' },
	},
}
