import { TestBed } from '@angular/core/testing'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { type RowAction, RowActionsMenu } from './row-actions-menu'

// Closes the open menu so the library tears down its overlay portal before the next test;
// TestBed.tick() flushes the signal-driven close under zoneless + happy-dom.
async function closeMenu(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.keyboard('{Escape}')
	TestBed.tick()
}

describe('RowActionsMenu', () => {
	beforeEach(() => clearAllMocks())

	it('renders nothing when actions is empty', async () => {
		await render(RowActionsMenu, {
			inputs: { actions: [] },
		})

		expect(screen.queryByRole('button')).toBeNull()
	})

	it('renders the trigger button with the default accessible name', async () => {
		await render(RowActionsMenu, {
			inputs: { actions: [{ label: 'Edit', onSelect: fn() }] },
		})

		expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
	})

	it('renders the trigger button with a custom accessible name via triggerLabel input', async () => {
		await render(RowActionsMenu, {
			inputs: {
				actions: [{ label: 'Edit', onSelect: fn() }],
				triggerLabel: 'Row actions',
			},
		})

		expect(screen.getByRole('button', { name: 'Row actions' })).toBeInTheDocument()
	})

	it('opens the menu on trigger click and reveals every action as a menuitem', async () => {
		const user = userEvent.setup()
		const actions: RowAction[] = [
			{ label: 'Edit', onSelect: fn() },
			{ label: 'Reset password', onSelect: fn() },
			{ label: 'Delete', onSelect: fn(), variant: 'destructive' },
		]
		await render(RowActionsMenu, { inputs: { actions } })

		await user.click(screen.getByRole('button', { name: 'Actions' }))

		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: 'Reset password' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()

		await closeMenu(user)
	})

	it('invokes the action onSelect callback when its menuitem is clicked', async () => {
		const user = userEvent.setup()
		const editSpy = fn()
		const deleteSpy = fn()
		await render(RowActionsMenu, {
			inputs: {
				actions: [
					{ label: 'Edit', onSelect: editSpy },
					{ label: 'Delete', onSelect: deleteSpy, variant: 'destructive' },
				],
			},
		})

		await user.click(screen.getByRole('button', { name: 'Actions' }))
		await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

		expect(deleteSpy.calls).toHaveLength(1)
		expect(editSpy.calls).toHaveLength(0)

		await closeMenu(user)
	})

	it('applies text-destructive to items with variant="destructive"', async () => {
		const user = userEvent.setup()
		await render(RowActionsMenu, {
			inputs: {
				actions: [
					{ label: 'Edit', onSelect: fn() },
					{ label: 'Delete', onSelect: fn(), variant: 'destructive' },
				],
			},
		})

		await user.click(screen.getByRole('button', { name: 'Actions' }))

		expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass('text-destructive')
		expect(screen.getByRole('menuitem', { name: 'Edit' })).not.toHaveClass('text-destructive')

		await closeMenu(user)
	})

	// Regression guard for theming: the panel takes its colors from the theme tokens, which switch
	// with dark mode, rather than from fixed grays.
	it('renders the menu panel with the theme color tokens', async () => {
		const user = userEvent.setup()
		await render(RowActionsMenu, {
			inputs: { actions: [{ label: 'Edit', onSelect: fn() }] },
		})

		await user.click(screen.getByRole('button', { name: 'Actions' }))
		const menu = screen.getByRole('menu')

		expect(menu).toHaveClass('bg-card', 'text-card-foreground', 'border-border')
		expect(menu).not.toHaveClass('bg-white')

		await closeMenu(user)
	})

	it('marks disabled items as disabled and does not invoke their callback on click', async () => {
		const user = userEvent.setup()
		const archivedSpy = fn()
		await render(RowActionsMenu, {
			inputs: {
				actions: [{ label: 'Archived', onSelect: archivedSpy, disabled: true }],
			},
		})

		await user.click(screen.getByRole('button', { name: 'Actions' }))
		const item = screen.getByRole('menuitem', { name: 'Archived' })
		expect(item).toBeDisabled()

		await user.click(item)
		expect(archivedSpy.calls).toHaveLength(0)

		await closeMenu(user)
	})

	it('keeps the data-touch-target attribute on the trigger for mobile hit area', async () => {
		await render(RowActionsMenu, {
			inputs: { actions: [{ label: 'Edit', onSelect: fn() }] },
		})

		expect(screen.getByRole('button', { name: 'Actions' })).toHaveAttribute('data-touch-target')
	})

	describe('grouped actions (matrix input)', () => {
		it('renders a separator between two non-empty groups', async () => {
			const user = userEvent.setup()
			const actions: RowAction[][] = [
				[
					{ label: 'Edit', onSelect: fn() },
					{ label: 'Reset password', onSelect: fn() },
				],
				[{ label: 'Delete', onSelect: fn(), variant: 'destructive' }],
			]
			await render(RowActionsMenu, { inputs: { actions } })

			await user.click(screen.getByRole('button', { name: 'Actions' }))

			expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
			expect(screen.getByRole('menuitem', { name: 'Reset password' })).toBeInTheDocument()
			expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
			expect(screen.getAllByRole('separator')).toHaveLength(1)

			await closeMenu(user)
		})

		it('does not render a separator when one of the groups is empty', async () => {
			const user = userEvent.setup()
			const actions: RowAction[][] = [[{ label: 'Edit', onSelect: fn() }], []]
			await render(RowActionsMenu, { inputs: { actions } })

			await user.click(screen.getByRole('button', { name: 'Actions' }))

			expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
			expect(screen.queryByRole('separator')).toBeNull()

			await closeMenu(user)
		})

		it('renders nothing when all groups are empty', async () => {
			await render(RowActionsMenu, { inputs: { actions: [[], []] } })

			expect(screen.queryByRole('button')).toBeNull()
		})

		it('renders multiple separators between three non-empty groups', async () => {
			const user = userEvent.setup()
			const actions: RowAction[][] = [
				[{ label: 'View', onSelect: fn() }],
				[{ label: 'Edit', onSelect: fn() }],
				[{ label: 'Delete', onSelect: fn(), variant: 'destructive' }],
			]
			await render(RowActionsMenu, { inputs: { actions } })

			await user.click(screen.getByRole('button', { name: 'Actions' }))

			expect(screen.getAllByRole('separator')).toHaveLength(2)

			await closeMenu(user)
		})
	})
})
