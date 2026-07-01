import {
	featherActivity,
	featherCalendar,
	featherFileText,
	featherHelpCircle,
	featherHome,
	featherMail,
	featherSettings,
	featherUser,
} from '@ng-icons/feather-icons'
import type {
	NavigationConfig,
	NavigationRoute,
	NavigationSection,
} from '@resetshop/angular-core/interfaces/navigation'

// ============================================================================
// LEAF ROUTES (No children)
// ============================================================================

export const mockHomeRoute: NavigationRoute = {
	id: 'home',
	name: 'Home',
	route: '/home',
	icon: { featherHome },
}

export const mockDashboardRoute: NavigationRoute = {
	id: 'dashboard',
	name: 'Home',
	route: '/dashboard',
	icon: { featherHome },
}

export const mockActivityRoute: NavigationRoute = {
	id: 'activity',
	name: 'Activity',
	route: '/activity',
	icon: { featherActivity },
}

export const mockHelpRoute: NavigationRoute = {
	id: 'help',
	name: 'Help',
	route: '/help',
	icon: { featherHelpCircle },
}

export const mockMessagesRoute: NavigationRoute = {
	id: 'messages',
	name: 'Messages',
	route: '/messages',
	icon: { featherMail },
}

export const mockCalendarRoute: NavigationRoute = {
	id: 'calendar',
	name: 'Calendar',
	route: '/calendar',
	icon: { featherCalendar },
}

export const mockDocumentsRoute: NavigationRoute = {
	id: 'documents',
	name: 'Documents',
	route: '/documents',
	icon: { featherFileText },
}

// ============================================================================
// PARENT ROUTES (With children)
// ============================================================================

export const mockUsersRoute: NavigationRoute = {
	id: 'users',
	name: 'Users',
	route: '/users',
	icon: { featherUser },
	children: [
		{ id: 'users-list', name: 'All Users', route: '/users/list' },
		{ id: 'users-create', name: 'Create User', route: '/users/create' },
		{ id: 'users-roles', name: 'User Roles', route: '/users/roles' },
	],
}

export const mockSettingsRoute: NavigationRoute = {
	id: 'settings',
	name: 'Settings',
	route: '/settings',
	icon: { featherSettings },
	children: [
		{ id: 'settings-profile', name: 'Profile', route: '/settings/profile' },
		{ id: 'settings-security', name: 'Security', route: '/settings/security' },
		{ id: 'settings-notifications', name: 'Notifications', route: '/settings/notifications' },
	],
}

// Variant with fewer children (for simpler examples)
export const mockSettingsRouteSimple: NavigationRoute = {
	id: 'settings',
	name: 'Settings',
	route: '/settings',
	icon: { featherSettings },
	children: [
		{ id: 'profile', name: 'Profile', route: '/settings/profile' },
		{ id: 'security', name: 'Security', route: '/settings/security' },
	],
}

// ============================================================================
// NAVIGATION SECTIONS
// ============================================================================

export const mockMainSection: NavigationSection = {
	id: 'main',
	name: 'Main Navigation',
	routes: [mockHomeRoute, mockActivityRoute],
}

export const mockMainMenuSection: NavigationSection = {
	id: 'main',
	name: 'Main Menu',
	routes: [mockHomeRoute, mockActivityRoute, mockMessagesRoute, mockCalendarRoute],
}

export const mockManagementSection: NavigationSection = {
	id: 'management',
	name: 'Management',
	routes: [mockUsersRoute, mockSettingsRoute],
}

export const mockMixedSection: NavigationSection = {
	id: 'main',
	name: 'Main Navigation',
	routes: [mockHomeRoute, mockUsersRoute, mockSettingsRouteSimple, mockHelpRoute],
}

// ============================================================================
// COMPLETE NAVIGATION CONFIGS
// ============================================================================

// For Sidebar stories - uses /dashboard instead of /home
export const mockSidebarNavigationConfig = {
	sections: [
		{
			id: 'main',
			name: 'Main Navigation',
			routes: [mockDashboardRoute, mockActivityRoute],
		},
		mockManagementSection,
	],
} as const satisfies NavigationConfig

// General purpose navigation config
export const mockNavigationConfig = {
	sections: [mockMainSection, mockManagementSection],
} as const satisfies NavigationConfig

// Full navigation with all sections
export const mockFullNavigationConfig = {
	sections: [
		mockMainMenuSection,
		mockManagementSection,
		{
			id: 'other',
			name: 'Other',
			routes: [mockDocumentsRoute, mockHelpRoute],
		},
	],
} as const satisfies NavigationConfig
