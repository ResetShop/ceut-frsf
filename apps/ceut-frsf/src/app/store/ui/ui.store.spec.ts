import { TestBed } from '@angular/core/testing'
import { parseDurationToMs } from '@resetshop/util'
import {
	advanceTimersByTimeAsync,
	clearAllMocks,
	spyOn,
	useFakeTimers,
	useRealTimers,
} from '@resetshop/util/test-utils'
import { DEFAULT_NOTIFICATION_DURATION } from './ui.constants'
import { UIStore } from './ui.store'
import { NotificationType } from './ui.types'

describe('UIStore', () => {
	let store: InstanceType<typeof UIStore>

	beforeEach(() => {
		clearAllMocks()

		TestBed.configureTestingModule({
			providers: [UIStore],
		})

		store = TestBed.inject(UIStore)
	})

	describe('initial state', () => {
		it('should have correct initial state', () => {
			expect(store.isSidebarOpen()).toBe(false)
			expect(store.isSidebarCollapsed()).toBe(false)
			expect(store.activeDrawer()).toBeNull()
			expect(store.notifications()).toEqual([])
			expect(store.isGlobalLoading()).toBe(false)
		})

		it('should have correct computed signals', () => {
			expect(store.hasNotifications()).toBe(false)
			expect(store.latestNotification()).toBeNull()
		})
	})

	describe('showNotification', () => {
		it('should add a notification with the correct type and message', () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('test-id-1')

			store.showNotification({ type: NotificationType.SUCCESS, message: 'Done' })

			expect(store.notifications()).toHaveLength(1)
			expect(store.notifications()[0].id).toBe('test-id-1')
			expect(store.notifications()[0].type).toBe('success')
			expect(store.notifications()[0].message).toBe('Done')
		})

		it('should set hasNotifications to true after adding', () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('test-id-2')

			store.showNotification({ type: NotificationType.INFO, message: 'Info' })

			expect(store.hasNotifications()).toBe(true)
		})

		it('should return the latest notification', () => {
			spyOn(crypto, 'randomUUID').mockReturnValueOnce('id-1').mockReturnValueOnce('id-2')

			store.showNotification({ type: NotificationType.SUCCESS, message: 'First' })
			store.showNotification({ type: NotificationType.ERROR, message: 'Second' })

			expect(store.latestNotification()?.message).toBe('Second')
			expect(store.notifications()).toHaveLength(2)
		})
	})

	describe('dismissNotification', () => {
		it('should remove the notification with the matching id', () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('dismiss-id')

			store.showNotification({ type: NotificationType.SUCCESS, message: 'Gone soon' })
			expect(store.notifications()).toHaveLength(1)

			store.dismissNotification('dismiss-id')

			expect(store.notifications()).toHaveLength(0)
			expect(store.hasNotifications()).toBe(false)
		})

		it('should not remove notifications with a different id', () => {
			spyOn(crypto, 'randomUUID').mockReturnValueOnce('keep-id').mockReturnValueOnce('remove-id')

			store.showNotification({ type: NotificationType.INFO, message: 'Keep' })
			store.showNotification({ type: NotificationType.ERROR, message: 'Remove' })

			store.dismissNotification('remove-id')

			expect(store.notifications()).toHaveLength(1)
			expect(store.notifications()[0].id).toBe('keep-id')
		})

		it('should be a no-op when called with an unknown id', () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('known-id')

			store.showNotification({ type: NotificationType.SUCCESS, message: 'Stay' })
			store.dismissNotification('unknown-id')

			expect(store.notifications()).toHaveLength(1)
		})
	})

	describe('auto-dismiss', () => {
		// Store is created under fake timers so that setTimeout inside showNotification
		// is intercepted deterministically. Each test gets a fresh store + fake timer context.
		let timerStore: InstanceType<typeof UIStore>

		beforeEach(() => {
			useFakeTimers()

			TestBed.resetTestingModule()
			TestBed.configureTestingModule({ providers: [UIStore] })
			timerStore = TestBed.inject(UIStore)
		})

		afterEach(() => {
			useRealTimers()
		})

		it('should auto-dismiss after default duration', async () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('auto-id')
			const defaultMs = parseDurationToMs(DEFAULT_NOTIFICATION_DURATION)

			timerStore.showNotification({ type: NotificationType.SUCCESS, message: 'Auto' })
			expect(timerStore.notifications()).toHaveLength(1)

			await advanceTimersByTimeAsync(defaultMs - 1)
			expect(timerStore.notifications()).toHaveLength(1)

			await advanceTimersByTimeAsync(1)
			expect(timerStore.notifications()).toHaveLength(0)
		})

		it('should auto-dismiss after custom duration', async () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('custom-id')

			timerStore.showNotification({ type: NotificationType.WARNING, message: 'Quick', duration: '3s' })

			await advanceTimersByTimeAsync(2999)
			expect(timerStore.notifications()).toHaveLength(1)

			await advanceTimersByTimeAsync(1)
			expect(timerStore.notifications()).toHaveLength(0)
		})

		it('should cancel timer when manually dismissed before auto-dismiss', async () => {
			spyOn(crypto, 'randomUUID').mockReturnValue('manual-id')

			timerStore.showNotification({ type: NotificationType.INFO, message: 'Manual dismiss' })
			timerStore.dismissNotification('manual-id')
			expect(timerStore.notifications()).toHaveLength(0)

			// Advancing past the original duration should not throw or re-add
			await advanceTimersByTimeAsync(6000)
			expect(timerStore.notifications()).toHaveLength(0)
		})
	})

	describe('toggleSidebar', () => {
		it('should flip isSidebarOpen from false to true', () => {
			store.toggleSidebar()
			expect(store.isSidebarOpen()).toBe(true)
		})

		it('should flip isSidebarOpen back to false', () => {
			store.toggleSidebar()
			store.toggleSidebar()
			expect(store.isSidebarOpen()).toBe(false)
		})
	})

	describe('setSidebarOpen', () => {
		it('should set isSidebarOpen to true', () => {
			store.setSidebarOpen(true)
			expect(store.isSidebarOpen()).toBe(true)
		})

		it('should set isSidebarOpen to false', () => {
			store.setSidebarOpen(true)
			store.setSidebarOpen(false)
			expect(store.isSidebarOpen()).toBe(false)
		})
	})

	describe('setSidebarCollapsed', () => {
		it('should set isSidebarCollapsed to true', () => {
			store.setSidebarCollapsed(true)
			expect(store.isSidebarCollapsed()).toBe(true)
		})

		it('should set isSidebarCollapsed to false', () => {
			store.setSidebarCollapsed(true)
			store.setSidebarCollapsed(false)
			expect(store.isSidebarCollapsed()).toBe(false)
		})
	})

	describe('openDrawer / closeDrawer', () => {
		it('should set activeDrawer to the provided string', () => {
			store.openDrawer('user-form')
			expect(store.activeDrawer()).toBe('user-form')
		})

		it('should set activeDrawer to null on close', () => {
			store.openDrawer('role-form')
			store.closeDrawer()
			expect(store.activeDrawer()).toBeNull()
		})
	})

	describe('setGlobalLoading', () => {
		it('should set isGlobalLoading to true', () => {
			store.setGlobalLoading(true)
			expect(store.isGlobalLoading()).toBe(true)
		})

		it('should set isGlobalLoading to false', () => {
			store.setGlobalLoading(true)
			store.setGlobalLoading(false)
			expect(store.isGlobalLoading()).toBe(false)
		})
	})
})
