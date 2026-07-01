import type { DurationString } from '@contracts/common/duration.schemas'

export const NotificationType = Object.freeze({
	SUCCESS: 'success',
	ERROR: 'error',
	WARNING: 'warning',
	INFO: 'info',
} as const)

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export interface UINotification {
	readonly id: string
	readonly type: NotificationType
	readonly message: string
	/** Auto-dismiss duration. Defaults to {@link DEFAULT_NOTIFICATION_DURATION}. Must be a valid duration string matching /^\d+[dhms]$/. */
	readonly duration?: DurationString
}

export interface UIState {
	readonly isSidebarOpen: boolean
	readonly isSidebarCollapsed: boolean
	readonly activeDrawer: string | null
	readonly notifications: UINotification[]
	readonly isGlobalLoading: boolean
}

export const initialUIState: UIState = {
	isSidebarOpen: false,
	isSidebarCollapsed: false,
	activeDrawer: null,
	notifications: [],
	isGlobalLoading: false,
}
