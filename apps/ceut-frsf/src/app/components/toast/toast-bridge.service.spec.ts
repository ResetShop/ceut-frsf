import { TestBed } from '@angular/core/testing'
import type { MockFn } from '@resetshop/util/test-utils'
import { clearAllMocks, fn } from '@resetshop/util/test-utils'
import { UIStore } from '@store/ui/ui.store'
import type { NgpToastRef } from 'ng-primitives/toast'
import { NgpToastManager } from 'ng-primitives/toast'
import { ToastBridgeService } from './toast-bridge.service'
import { ToastNotification } from './toast-notification'

describe('ToastBridgeService', () => {
	let uiStore: InstanceType<typeof UIStore>
	let showMock: MockFn<[unknown, unknown?], NgpToastRef>
	let dismissMock: MockFn<[], Promise<void>>

	beforeEach(() => {
		clearAllMocks()

		dismissMock = fn<[], Promise<void>>()
		dismissMock.mockResolvedValue(undefined)

		showMock = fn<[unknown, unknown?], NgpToastRef>()
		showMock.mockReturnValue({ dismiss: dismissMock })

		TestBed.configureTestingModule({
			providers: [ToastBridgeService, { provide: NgpToastManager, useValue: { show: showMock, dismiss: fn() } }],
		})

		uiStore = TestBed.inject(UIStore)
		TestBed.inject(ToastBridgeService)
	})

	it('should call NgpToastManager.show when a notification is added', () => {
		uiStore.showNotification({ type: 'success', message: 'Saved' })
		TestBed.tick()

		expect(showMock.calls).toHaveLength(1)
		expect(showMock.calls[0][0]).toBe(ToastNotification)
		expect(showMock.calls[0][1]).toEqual(
			expect.objectContaining({ context: expect.objectContaining({ message: 'Saved', type: 'success' }) }),
		)
	})

	it('should not call show twice for the same notification', () => {
		uiStore.showNotification({ type: 'info', message: 'Hello' })
		TestBed.tick()

		const firstCallCount = showMock.calls.length
		// Trigger another effect cycle without adding a new notification
		uiStore.setSidebarOpen(true)
		TestBed.tick()

		expect(showMock.calls).toHaveLength(firstCallCount)
	})

	it('should dismiss toast ref when notification is removed from UIStore', () => {
		uiStore.showNotification({ type: 'error', message: 'Failed' })
		TestBed.tick()

		const notifications = uiStore.notifications()
		uiStore.dismissNotification(notifications[0].id)
		TestBed.tick()

		expect(dismissMock.calls).toHaveLength(1)
	})
})
