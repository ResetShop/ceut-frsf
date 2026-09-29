import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { render, screen, within } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import type { NgpMenuPlacement } from 'ng-primitives/menu'
import { type MenuItem } from '../menu/menu'
import { UserMenu } from './user-menu'

@Component({ template: '' })
class BlankPage {}

// Item rendering, grouping and nesting belong to `Menu` and are covered by its spec; these tests cover
// what `UserMenu` adds: the tile, the identity header, and handing its items to the menu.
describe('UserMenu', () => {
	let logOut: MockFn
	let items: MenuItem[][]

	beforeEach(() => {
		clearAllMocks()
		logOut = fn()
		items = [
			[
				{ label: 'Account', route: '/account' },
				{ label: 'Settings', route: '/settings' },
			],
			[{ label: 'Log out', onSelect: logOut }],
		]
	})

	async function renderMenu(overrides: { collapsed?: boolean; placement?: NgpMenuPlacement } = {}) {
		return render(UserMenu, {
			inputs: { name: 'Ada Lovelace', email: 'ada@example.com', initials: 'AL', items, ...overrides },
			providers: [provideRouter([{ path: '**', component: BlankPage }])],
		})
	}

	function trigger(): HTMLElement {
		return screen.getByRole('button', { name: 'Ada Lovelace' })
	}

	async function openMenu(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
		await user.click(trigger())
		TestBed.tick()
		return screen.getByRole('menu')
	}

	// Closes the menu so the overlay portal is torn down before the next test; TestBed.tick() flushes
	// the signal-driven close under zoneless + happy-dom.
	async function closeMenu(user: ReturnType<typeof userEvent.setup>): Promise<void> {
		await user.keyboard('{Escape}')
		TestBed.tick()
	}

	describe('trigger', () => {
		it('shows the avatar, name and email when expanded', async () => {
			await renderMenu()

			expect(within(trigger()).getByText('AL')).toBeInTheDocument()
			expect(within(trigger()).getByText('Ada Lovelace')).toBeInTheDocument()
			expect(within(trigger()).getByText('ada@example.com')).toBeInTheDocument()
		})

		it('shows only the avatar when collapsed, while still being named after the user', async () => {
			await renderMenu({ collapsed: true })

			expect(within(trigger()).getByText('AL')).toBeInTheDocument()
			expect(within(trigger()).queryByText('Ada Lovelace')).not.toBeInTheDocument()
			expect(within(trigger()).queryByText('ada@example.com')).not.toBeInTheDocument()
		})

		it('hides its ⋮ indicator from assistive technology, leaving the user’s name as its label', async () => {
			await renderMenu()

			expect(within(trigger()).getByTestId('menu-indicator')).toHaveAttribute('aria-hidden', 'true')
		})

		it('announces itself as opening a menu', async () => {
			await renderMenu()

			// ARIA defines aria-haspopup="true" as equivalent to "menu"; the menu primitive sets "true".
			expect(trigger()).toHaveAttribute('aria-haspopup', 'true')
			expect(trigger()).toHaveAttribute('aria-expanded', 'false')
		})

		it('opens the menu to the right of the trigger by default', async () => {
			await renderMenu()

			expect(trigger()).toHaveAttribute('data-placement', 'right-end')
		})

		it('opens the menu where the caller asks', async () => {
			await renderMenu({ placement: 'top' })

			expect(trigger()).toHaveAttribute('data-placement', 'top')
		})

		it('closes the menu on Escape and takes focus back', async () => {
			const user = userEvent.setup()
			await renderMenu()

			await openMenu(user)
			expect(trigger()).toHaveAttribute('aria-expanded', 'true')

			await closeMenu(user)

			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger()).toHaveFocus()
		})
	})

	describe('menu', () => {
		it('opens with a header repeating the user’s name and email, which is not a menu item', async () => {
			const user = userEvent.setup()
			await renderMenu({ collapsed: true })

			const menu = await openMenu(user)

			expect(within(menu).getByText('Ada Lovelace')).toBeInTheDocument()
			expect(within(menu).getByText('ada@example.com')).toBeInTheDocument()
			expect(within(menu).queryByRole('menuitem', { name: /Ada Lovelace/ })).not.toBeInTheDocument()

			await closeMenu(user)
		})

		it('lists the items it is given, separated from the header and from each other', async () => {
			const user = userEvent.setup()
			await renderMenu()

			const menu = await openMenu(user)

			expect(
				within(menu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent?.trim()),
			).toEqual(['Account', 'Settings', 'Log out'])
			expect(within(menu).getByRole('menuitem', { name: 'Account' })).toHaveAttribute('href', '/account')
			expect(within(menu).getAllByRole('separator')).toHaveLength(2)

			await closeMenu(user)
		})

		it('runs the selected action', async () => {
			const user = userEvent.setup()
			await renderMenu()

			await openMenu(user)
			await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
			TestBed.tick()

			expect(logOut.calls).toHaveLength(1)
		})
	})
})
