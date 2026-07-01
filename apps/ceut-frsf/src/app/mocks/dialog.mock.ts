import { fn, type MockFn } from '@resetshop/util/test-utils'

export let mockShowModal: MockFn<[], void>
export let mockClose: MockFn<[], void>

/**
 * Replace HTMLDialogElement.prototype.showModal/close with mock functions
 * that simulate the open/close attribute behavior used by happy-dom.
 * Call this in `beforeEach()` together with `clearAllMocks()`.
 */
export function mockDialog(): void {
	mockShowModal = fn<[], void>()
	mockShowModal.mockImplementation(function (this: HTMLDialogElement) {
		this.setAttribute('open', '')
	})
	HTMLDialogElement.prototype.showModal = mockShowModal

	mockClose = fn<[], void>()
	mockClose.mockImplementation(function (this: HTMLDialogElement) {
		this.removeAttribute('open')
	})
	HTMLDialogElement.prototype.close = mockClose
}
