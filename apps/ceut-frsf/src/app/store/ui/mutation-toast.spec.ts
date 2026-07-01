import { TestBed } from '@angular/core/testing'
import type { MockFn } from '@resetshop/util/test-utils'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import type { MutationToast } from './mutation-toast'
import { createMutationToast } from './mutation-toast'
import { UIStore } from './ui.store'
import { NotificationType } from './ui.types'

describe('createMutationToast', () => {
	let showNotificationMock: MockFn
	let toast: MutationToast

	beforeEach(() => {
		clearAllMocks()

		TestBed.configureTestingModule({ providers: [UIStore] })

		const uiStore = TestBed.inject(UIStore)
		showNotificationMock = fn()
		uiStore.showNotification = showNotificationMock
	})

	function createToast(message: string, options?: { deferred?: boolean }): MutationToast {
		return TestBed.runInInjectionContext(() => createMutationToast(message, options))
	}

	describe('handleResult', () => {
		beforeEach(() => {
			toast = createToast('Saved!')
		})

		it('should return null when not submitted', () => {
			expect(toast.handleResult(false, null)).toBeNull()
			expect(showNotificationMock.calls).toHaveLength(0)
		})

		it('should return null while loading', () => {
			toast.markSubmitted()

			expect(toast.handleResult(true, null)).toBeNull()
			expect(showNotificationMock.calls).toHaveLength(0)
		})

		it('should return success and show notification on non-deferred success', () => {
			toast.markSubmitted()

			expect(toast.handleResult(false, null)).toBe('success')
			expect(showNotificationMock.calls).toHaveLength(1)
			expect(showNotificationMock.calls[0][0]).toEqual({
				type: NotificationType.SUCCESS,
				message: 'Saved!',
			})
		})

		it('should return error and show error notification', () => {
			toast.markSubmitted()

			expect(toast.handleResult(false, 'Something broke')).toBe('error')
			expect(showNotificationMock.calls).toHaveLength(1)
			expect(showNotificationMock.calls[0][0]).toEqual({
				type: NotificationType.ERROR,
				message: 'Something broke',
			})
		})

		it('should reset submitted flag after resolving success', () => {
			toast.markSubmitted()
			toast.handleResult(false, null)

			expect(toast.handleResult(false, null)).toBeNull()
			expect(showNotificationMock.calls).toHaveLength(1)
		})

		it('should reset submitted flag after resolving error', () => {
			toast.markSubmitted()
			toast.handleResult(false, 'Fail')

			expect(toast.handleResult(false, 'Fail')).toBeNull()
			expect(showNotificationMock.calls).toHaveLength(1)
		})
	})

	describe('deferred mode', () => {
		beforeEach(() => {
			toast = createToast('Created!', { deferred: true })
		})

		it('should store pending notification instead of showing it on success', () => {
			toast.markSubmitted()

			expect(toast.handleResult(false, null)).toBe('success')
			expect(showNotificationMock.calls).toHaveLength(0)
		})

		it('should suppress error notification when deferred (drawer shows inline alert)', () => {
			toast.markSubmitted()

			expect(toast.handleResult(false, 'Server error')).toBe('error')
			expect(showNotificationMock.calls).toHaveLength(0)
		})
	})

	describe('flushPending', () => {
		beforeEach(() => {
			toast = createToast('Created!', { deferred: true })
		})

		it('should show the stored pending notification', () => {
			toast.markSubmitted()
			toast.handleResult(false, null)

			toast.flushPending()

			expect(showNotificationMock.calls).toHaveLength(1)
			expect(showNotificationMock.calls[0][0]).toEqual({
				type: NotificationType.SUCCESS,
				message: 'Created!',
			})
		})

		it('should clear pending after flushing', () => {
			toast.markSubmitted()
			toast.handleResult(false, null)

			toast.flushPending()
			toast.flushPending()

			expect(showNotificationMock.calls).toHaveLength(1)
		})

		it('should be a no-op when there is no pending notification', () => {
			toast.flushPending()

			expect(showNotificationMock.calls).toHaveLength(0)
		})
	})
})
