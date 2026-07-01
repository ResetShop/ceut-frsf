import type { Meta, StoryObj } from '@storybook/angular'
import { PageShell } from './page-shell'

const meta: Meta<PageShell & { description: string; content: string }> = {
	component: PageShell,
	title: 'Components/PageShell',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
A wrapper component for consistent page layouts with title, description, loading, and error states.

## Features

- **Required title** rendered as \`<h1>\`
- **Optional description** via \`[pageDescription]\` content projection (hidden when empty)
- **Optional actions header** via \`[pageActions]\` content projection (search inputs, buttons)
- **Optional action skeletons** via \`[pageActionsSkeleton]\` — shown during loading, replaced by real actions when loading completes
- **Loading state** shows a centered spinner with "Cargando..." text (default state on mount)
- **Mandatory 1s minimum display** before content appears, preventing layout flash
- **Error state** shows a destructive alert
- **Default content** projected after minimum display when not loading and no error

## Usage

\`\`\`html
<app-page-shell title="Roles" [loading]="store.isLoading()" [error]="store.readError().list">
  <p pageDescription>Manage system roles.</p>
  <!-- page content here -->
</app-page-shell>
\`\`\`
				`,
			},
			canvas: {
				sourceState: 'shown',
			},
		},
	},
	argTypes: {
		title: {
			control: 'text',
			description: 'Page heading text',
		},
		loading: {
			control: 'boolean',
			description: 'Shows loading state. Defaults to true — content appears after 1s minimum.',
			table: { defaultValue: { summary: 'true' } },
		},
		error: {
			control: 'text',
			description: 'Shows a destructive alert when set',
			table: { defaultValue: { summary: 'null' } },
		},
		description: {
			control: 'text',
			description: 'Description text projected via [pageDescription]',
		},
	},
}

export default meta

type Story = StoryObj<PageShell & { description: string }>

/** Default state — loading is true, spinner shown with "Cargando..." text for 1s minimum */
export const Default: Story = {
	args: {
		title: 'Roles',
		loading: false,
		error: null,
		description: 'Manage system roles and their associated permissions.',
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						Page content goes here
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

/** Loading state — spinner and "Cargando..." text displayed in a styled container */
export const Loading: Story = {
	args: {
		title: 'Roles',
		loading: true,
		error: null,
		description: 'Manage system roles and their associated permissions.',
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						This content is hidden while loading
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

export const Error: Story = {
	args: {
		title: 'Roles',
		loading: false,
		error: 'Failed to load roles. Please try again later.',
		description: 'Manage system roles and their associated permissions.',
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						This content is hidden when there is an error
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

/** Page with an actions header (search input + button) above the content area */
export const WithActions: Story = {
	args: {
		title: 'Users',
		loading: false,
		error: null,
		description: 'Manage system users, their roles, and account status.',
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div pageActionsSkeleton class="flex items-center justify-between gap-4">
						<div class="bg-muted h-9 w-full max-w-sm animate-pulse rounded-md"></div>
						<div class="bg-muted h-9 w-24 animate-pulse rounded-md"></div>
					</div>
					<div pageActions class="flex items-center justify-between gap-4">
						<input type="search" placeholder="Search users..."
							class="border-input bg-background text-foreground h-9 w-full max-w-sm rounded-md border px-3 text-sm" />
						<button class="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium">Create User</button>
					</div>
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						Data table goes here
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

/** Loading state with skeleton placeholders for action controls */
export const WithActionsLoading: Story = {
	args: {
		title: 'Users',
		loading: true,
		error: null,
		description: 'Manage system users, their roles, and account status.',
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div pageActionsSkeleton class="flex items-center justify-between gap-4">
						<div class="bg-muted h-9 w-full max-w-sm animate-pulse rounded-md"></div>
						<div class="bg-muted h-9 w-24 animate-pulse rounded-md"></div>
					</div>
					<div pageActions class="flex items-center justify-between gap-4">
						<input type="search" placeholder="Search users..."
							class="border-input bg-background text-foreground h-9 w-full max-w-sm rounded-md border px-3 text-sm" />
						<button class="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium">Create User</button>
					</div>
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						Data table goes here
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

/**
 * Mobile-viewport rendering. Title scales to `text-xl`, section gaps tighten to `space-y-4`, and
 * the action bar stacks `flex-col` with full-width controls. Pick a non-mobile viewport (or resize)
 * to see the desktop `text-2xl` / `space-y-6` / side-by-side action layout.
 */
export const MobileLayout: Story = {
	args: {
		title: 'Users',
		loading: false,
		error: null,
		description: 'Manage system users, their roles, and account status.',
	},
	parameters: {
		viewport: { defaultViewport: 'mobile' },
		docs: { canvas: { sourceState: 'shown' } },
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-2 sm:p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<p pageDescription>{{ description }}</p>
					<div pageActions class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
						<input type="search" placeholder="Search users..."
							class="border-input bg-background text-foreground h-9 w-full max-w-sm rounded-md border px-3 text-base sm:text-sm" />
						<button class="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium w-full sm:w-auto">Create User</button>
					</div>
					<div class="rounded-lg border border-border bg-card p-3 sm:p-4 md:p-5 text-center text-muted-foreground">
						Data table goes here
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}

export const NoDescription: Story = {
	args: {
		title: 'Dashboard',
		loading: false,
		error: null,
	},
	render: (args) => ({
		props: args,
		moduleMetadata: { imports: [PageShell] },
		template: `
			<div class="bg-background p-6 rounded border border-border">
				<app-page-shell [title]="title" [loading]="loading" [error]="error">
					<div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
						Page without description — the empty paragraph is hidden via empty:hidden
					</div>
				</app-page-shell>
			</div>
		`,
	}),
}
