import type { Meta, StoryObj } from '@storybook/angular'
import { Avatar } from './avatar'

const meta: Meta<Avatar> = {
	component: Avatar,
	title: 'Components/Avatar',
	tags: ['autodocs'],
	argTypes: {
		initials: {
			control: 'text',
			description: 'The characters to show. The caller derives them from the person’s name.',
			table: { type: { summary: 'string' } },
		},
	},
	parameters: {
		docs: {
			description: {
				component: `
A rounded tile showing a person's initials.

It is **decorative** — hidden from assistive technology — so always render it next to the
person's name, or inside a control whose accessible name identifies them.
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
}

export default meta
type Story = StoryObj<Avatar>

export const Default: Story = {
	args: { initials: 'AL' },
}

/** A person with a single name, or whose surname is unknown, gets one character. */
export const SingleInitial: Story = {
	args: { initials: 'A' },
}

/** Initials are shown upper-cased whatever case the caller passes. */
export const LowercaseInput: Story = {
	args: { initials: 'gh' },
}
