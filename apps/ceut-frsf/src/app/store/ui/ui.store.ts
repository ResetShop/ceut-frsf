import { computed, DestroyRef, inject } from '@angular/core'
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals'
import { parseDurationToMs } from '@resetshop/util'
import { DEFAULT_NOTIFICATION_DURATION } from './ui.constants'
import { initialUIState, type UINotification } from './ui.types'

/**
 * UIStore - Signal Store for global UI concerns
 *
 * Manages sidebar state, drawer state, toast notifications with auto-dismiss,
 * and a global loading flag. Purely client-side — no API dependencies.
 */
export const UIStore = signalStore(
	{ providedIn: 'root' },
	withState(initialUIState),
	withComputed((store) => ({
		hasNotifications: computed(() => store.notifications().length > 0),
		latestNotification: computed(() => store.notifications().at(-1) ?? null),
	})),
	withMethods((store) => {
		const destroyRef = inject(DestroyRef)
		const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

		destroyRef.onDestroy(() => {
			for (const handle of timeouts.values()) clearTimeout(handle)
			timeouts.clear()
		})

		function dismissNotification(id: string): void {
			const handle = timeouts.get(id)
			if (handle !== undefined) {
				clearTimeout(handle)
				timeouts.delete(id)
			}
			patchState(store, { notifications: store.notifications().filter((n) => n.id !== id) })
		}

		return {
			dismissNotification,

			showNotification(notification: Omit<UINotification, 'id'>): void {
				const id = crypto.randomUUID()
				patchState(store, { notifications: [...store.notifications(), { ...notification, id }] })
				const delay = parseDurationToMs(notification.duration ?? DEFAULT_NOTIFICATION_DURATION)
				const handle = setTimeout(() => dismissNotification(id), delay)
				timeouts.set(id, handle)
			},

			toggleSidebar(): void {
				patchState(store, { isSidebarOpen: !store.isSidebarOpen() })
			},

			setSidebarOpen(isOpen: boolean): void {
				patchState(store, { isSidebarOpen: isOpen })
			},

			setSidebarCollapsed(collapsed: boolean): void {
				patchState(store, { isSidebarCollapsed: collapsed })
			},

			openDrawer(drawer: string): void {
				patchState(store, { activeDrawer: drawer })
			},

			closeDrawer(): void {
				patchState(store, { activeDrawer: null })
			},

			setGlobalLoading(isLoading: boolean): void {
				patchState(store, { isGlobalLoading: isLoading })
			},
		}
	}),
)
