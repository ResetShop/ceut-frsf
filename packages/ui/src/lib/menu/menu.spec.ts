import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import { featherLogOut, featherSun, featherUser } from '@ng-icons/feather-icons'
import { clearAllMocks, fn, type MockFn } from '@resetshop/util/test-utils'
import { render, screen, within } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { NgpMenuTrigger } from 'ng-primitives/menu'
import { Menu, MenuHeader, type MenuItem } from './menu'
import { type MenuItemsInput } from './menu-groups'

@Component({ template: '' })
class BlankPage {}

describe('Menu', () => {
	let logOut: MockFn
	let setDarkTheme: MockFn

	beforeEach(() => {
		clearAllMocks()
		logOut = fn()
		setDarkTheme = fn()
	})

	async function renderMenu(items: MenuItemsInput<MenuItem>, options: { header?: boolean } = {}) {
		const header = options.header ? '<div appMenuHeader>Signed in as Ada</div>' : ''
		return render(
			`<button [ngpMenuTrigger]="menu" type="button">Open</button>
			<ng-template #menu><app-menu [items]="items">${header}</app-menu></ng-template>`,
			{
				imports: [Menu, MenuHeader, NgpMenuTrigger],
				componentProperties: { items },
				providers: [
					provideRouter([{ path: '**', component: BlankPage }]),
					provideIcons({ featherUser, featherLogOut, featherSun }),
				],
			},
		)
	}

	async function open(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
		await user.click(screen.getByRole('button', { name: 'Open' }))
		TestBed.tick()
		return screen.getByRole('menu')
	}

	// Closes every open menu so the overlay portals are torn down before the next test; TestBed.tick()
	// flushes the signal-driven close under zoneless + happy-dom.
	async function closeAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
		await user.keyboard('{Escape}')
		TestBed.tick()
	}

	const account: MenuItem = { label: 'Account', route: '/account' }
	const settings: MenuItem = { label: 'Settings', route: '/settings' }

	describe('items and groups', () => {
		it('lists every item as a menu item, in order', async () => {
			const user = userEvent.setup()
			await renderMenu([account, settings, { label: 'Log out', onSelect: logOut }])

			const menu = await open(user)

			expect(
				within(menu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent?.trim()),
			).toEqual(['Account', 'Settings', 'Log out'])

			await closeAll(user)
		})

		it('renders no separator for a single group', async () => {
			const user = userEvent.setup()
			await renderMenu([account, settings])

			const menu = await open(user)

			expect(within(menu).queryByRole('separator')).not.toBeInTheDocument()

			await closeAll(user)
		})

		it('separates each group from the next, skipping empty groups', async () => {
			const user = userEvent.setup()
			await renderMenu([[account], [], [settings], [{ label: 'Log out', onSelect: logOut }]])

			const menu = await open(user)

			expect(within(menu).getAllByRole('separator')).toHaveLength(2)

			await closeAll(user)
		})
	})

	describe('header', () => {
		it('renders projected header content above the items, separated from them', async () => {
			const user = userEvent.setup()
			await renderMenu([account], { header: true })

			const menu = await open(user)

			expect(within(menu).getByText('Signed in as Ada')).toBeInTheDocument()
			expect(within(menu).getAllByRole('separator')).toHaveLength(1)

			await closeAll(user)
		})

		it('is not a menu item', async () => {
			const user = userEvent.setup()
			await renderMenu([account], { header: true })

			const menu = await open(user)

			expect(
				within(menu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent?.trim()),
			).toEqual(['Account'])

			await closeAll(user)
		})
	})

	describe('link items', () => {
		it('link to their route, so they can be opened in a new tab or copied', async () => {
			const user = userEvent.setup()
			await renderMenu([account, settings])

			await open(user)

			expect(screen.getByRole('menuitem', { name: 'Account' })).toHaveAttribute('href', '/account')
			expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/settings')

			await closeAll(user)
		})

		it('navigate to their route and close the menu', async () => {
			const user = userEvent.setup()
			const { fixture } = await renderMenu([account, settings])

			await open(user)
			await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
			await fixture.whenStable()
			TestBed.tick()

			expect(TestBed.inject(Router).url).toBe('/settings')
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})

		it('drop their URL and are announced as unavailable when disabled', async () => {
			const user = userEvent.setup()
			await renderMenu([{ label: 'Billing', route: '/billing', disabled: true }])

			await open(user)
			const billing = screen.getByRole('menuitem', { name: 'Billing' })

			expect(billing).not.toHaveAttribute('href')
			expect(billing).toHaveAttribute('aria-disabled', 'true')

			await closeAll(user)
		})
	})

	describe('action items', () => {
		it('are buttons rather than links', async () => {
			const user = userEvent.setup()
			await renderMenu([{ label: 'Log out', onSelect: logOut }])

			await open(user)
			const logOutItem = screen.getByRole('menuitem', { name: 'Log out' })

			expect(logOutItem).toHaveAttribute('type', 'button')
			expect(logOutItem).not.toHaveAttribute('href')

			await closeAll(user)
		})

		it('run their action, without navigating, and close the menu', async () => {
			const user = userEvent.setup()
			await renderMenu([account, { label: 'Log out', onSelect: logOut }])

			await open(user)
			await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
			TestBed.tick()

			expect(logOut.calls).toHaveLength(1)
			expect(TestBed.inject(Router).url).toBe('/')
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})

		it('cannot be run when disabled', async () => {
			const user = userEvent.setup()
			await renderMenu([{ label: 'Log out', onSelect: logOut, disabled: true }])

			await open(user)
			const logOutItem = screen.getByRole('menuitem', { name: 'Log out' })
			await user.click(logOutItem)

			expect(logOutItem).toBeDisabled()
			expect(logOut.calls).toHaveLength(0)

			await closeAll(user)
		})

		it('render destructive actions in the destructive color', async () => {
			const user = userEvent.setup()
			await renderMenu([{ label: 'Delete account', onSelect: fn(), variant: 'destructive' }])

			await open(user)

			expect(screen.getByRole('menuitem', { name: 'Delete account' })).toHaveClass('text-destructive')

			await closeAll(user)
		})
	})

	describe('icons', () => {
		it('are hidden from assistive technology on every item kind, since the label names the item', async () => {
			const user = userEvent.setup()
			await renderMenu([
				{ label: 'Account', icon: 'featherUser', route: '/account' },
				{ label: 'Log out', icon: 'featherLogOut', onSelect: logOut },
				{ label: 'Theme', icon: 'featherSun', items: [{ label: 'Dark', onSelect: () => undefined }] },
			])

			await open(user)
			const icons = screen.getAllByTestId('menu-item-icon')

			expect(icons).toHaveLength(3)
			icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
			expect(screen.getByTestId('submenu-indicator')).toHaveAttribute('aria-hidden', 'true')

			await closeAll(user)
		})
	})

	describe('nested menus', () => {
		const theme: MenuItem = {
			label: 'Theme',
			items: [
				{ label: 'Light', onSelect: () => undefined },
				{ label: 'Dark', onSelect: () => setDarkTheme() },
			],
		}

		it('announce that they open a menu, which stays closed until asked', async () => {
			const user = userEvent.setup()
			await renderMenu([account, theme])

			await open(user)
			const themeItem = screen.getByRole('menuitem', { name: 'Theme' })

			expect(themeItem).toHaveAttribute('aria-haspopup', 'true')
			expect(themeItem).toHaveAttribute('aria-expanded', 'false')
			expect(screen.getAllByRole('menu')).toHaveLength(1)

			await closeAll(user)
		})

		it('open when hovered with a pointer', async () => {
			const user = userEvent.setup()
			await renderMenu([account, theme])

			await open(user)
			await user.hover(screen.getByRole('menuitem', { name: 'Theme' }))
			TestBed.tick()

			const [, submenu] = screen.getAllByRole('menu')
			expect(
				within(submenu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent?.trim()),
			).toEqual(['Light', 'Dark'])

			await closeAll(user)
			await closeAll(user)
		})

		it('open on a tap, which has no hover to open them first', async () => {
			const user = userEvent.setup()
			await renderMenu([account, theme])

			await open(user)
			await user.pointer({ keys: '[TouchA]', target: screen.getByRole('menuitem', { name: 'Theme' }) })
			TestBed.tick()

			expect(screen.getAllByRole('menu')).toHaveLength(2)

			await closeAll(user)
			await closeAll(user)
		})

		it('open from the keyboard with the right arrow', async () => {
			const user = userEvent.setup()
			await renderMenu([theme])

			await open(user)
			screen.getByRole('menuitem', { name: 'Theme' }).focus()
			await user.keyboard('{ArrowRight}')
			TestBed.tick()

			expect(screen.getAllByRole('menu')).toHaveLength(2)

			await closeAll(user)
			await closeAll(user)
		})

		it('run a nested action and close every open menu', async () => {
			const user = userEvent.setup()
			await renderMenu([account, theme])

			await open(user)
			await user.hover(screen.getByRole('menuitem', { name: 'Theme' }))
			TestBed.tick()
			await user.click(screen.getByRole('menuitem', { name: 'Dark' }))
			TestBed.tick()

			expect(setDarkTheme.calls).toHaveLength(1)
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		})

		it('nest to any depth', async () => {
			const user = userEvent.setup()
			await renderMenu([{ label: 'Preferences', items: [theme] }])

			await open(user)
			await user.hover(screen.getByRole('menuitem', { name: 'Preferences' }))
			TestBed.tick()
			await user.hover(screen.getByRole('menuitem', { name: 'Theme' }))
			TestBed.tick()

			expect(screen.getAllByRole('menu')).toHaveLength(3)
			expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument()

			await closeAll(user)
			await closeAll(user)
			await closeAll(user)
		})
	})
})
