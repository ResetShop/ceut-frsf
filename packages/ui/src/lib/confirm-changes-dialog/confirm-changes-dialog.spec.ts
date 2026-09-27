import { Component, input, output, viewChild } from '@angular/core'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { render, screen, within } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { mockDialog, mockShowModal } from '../../testing/dialog.mock'
import { ConfirmChangesDialog, type ConfirmChangesEntry } from './confirm-changes-dialog'

@Component({
	selector: 'app-confirm-changes-dialog-test-host',
	standalone: true,
	imports: [ConfirmChangesDialog],
	template: `
		<app-confirm-changes-dialog
			(confirmed)="confirmed.emit()"
			(cancelled)="cancelled.emit()"
			[title]="title()"
			[message]="message()"
			[changes]="changes()"
			[confirmText]="confirmText()"
		/>
	`,
})
class ConfirmChangesDialogTestHost {
	public readonly title = input('Confirm changes')
	public readonly message = input('Review the changes below.')
	public readonly changes = input<ConfirmChangesEntry[]>([])
	public readonly confirmText = input('Save changes')
	public readonly confirmed = output<void>()
	public readonly cancelled = output<void>()
	public readonly dialog = viewChild.required(ConfirmChangesDialog)
}

const changes: ConfirmChangesEntry[] = [
	{ label: 'First name', before: 'Ada', after: 'Grace' },
	{ label: 'Roles', before: 'Admin', after: 'Admin, Editor' },
	{ label: 'Status', before: 'Active', after: 'Disabled' },
]

async function renderAndOpen(inputs: Record<string, unknown> = {}, on: Record<string, unknown> = {}) {
	const view = await render(ConfirmChangesDialogTestHost, { inputs: { changes, ...inputs }, on: on as never })
	view.fixture.componentInstance.dialog().show()
	view.fixture.detectChanges()
	return view
}

describe('ConfirmChangesDialog', () => {
	beforeEach(() => {
		clearAllMocks()
		mockDialog()
	})

	it('should open the underlying dialog when show() is called', async () => {
		await renderAndOpen()

		expect(mockShowModal.calls).toHaveLength(1)
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
	})

	it('should render no rows when there is nothing to confirm', async () => {
		await renderAndOpen({ changes: [] })

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		expect(screen.queryAllByRole('term')).toHaveLength(0)
	})

	it('should render the title and message', async () => {
		await renderAndOpen()

		expect(screen.getByRole('heading', { name: 'Confirm changes' })).toBeInTheDocument()
		expect(screen.getByText('Review the changes below.')).toBeInTheDocument()
	})

	it('should render one term per changed field', async () => {
		await renderAndOpen()

		const terms = screen.getAllByRole('term')
		expect(terms.map((term) => term.textContent?.trim())).toEqual(['First name', 'Roles', 'Status'])
	})

	it('should render the before and after values with screen-reader prefixes', async () => {
		await renderAndOpen()

		const [firstName] = screen.getAllByRole('definition')
		expect(within(firstName).getByText('Ada', { exact: false })).toHaveTextContent('Before: Ada')
		expect(within(firstName).getByText('Grace', { exact: false })).toHaveTextContent('After: Grace')
	})

	it('should use the provided screen-reader labels', async () => {
		await render(
			`<app-confirm-changes-dialog [changes]="changes" beforeLabel="Antes" afterLabel="Después" #dialog />
			<button (click)="dialog.show()">Open</button>`,
			{ imports: [ConfirmChangesDialog], componentProperties: { changes: [changes[0]] } },
		)
		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const definition = screen.getByRole('definition')
		expect(definition).toHaveTextContent('Antes: Ada')
		expect(definition).toHaveTextContent('Después: Grace')
	})

	it('should emit confirmed when the confirm button is clicked', async () => {
		const confirmedSpy = fn<[void], void>()
		await renderAndOpen({}, { confirmed: confirmedSpy })

		await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

		expect(confirmedSpy.calls).toHaveLength(1)
	})

	it('should emit cancelled when the cancel button is clicked', async () => {
		const cancelledSpy = fn<[void], void>()
		await renderAndOpen({}, { cancelled: cancelledSpy })

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		expect(cancelledSpy.calls).toHaveLength(1)
	})
})
