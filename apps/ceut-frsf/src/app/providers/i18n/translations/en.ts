import type { TranslationSchema } from '@resetshop/angular-core/i18n/translations.schema'

const en: TranslationSchema = {
	AUTH: {
		LOGIN: {
			TITLE: 'Sign in to your account',
			EMAIL_LABEL: 'Email address',
			PASSWORD_LABEL: 'Password',
			FORGOT_PASSWORD: 'Forgot your password?',
			SUBMIT: 'Sign in',
		},
		CHANGE_PASSWORD: {
			TITLE: 'Change your password',
			DESCRIPTION: 'For your security, set a new password before continuing.',
			OLD_PASSWORD_LABEL: 'Current password',
			NEW_PASSWORD_LABEL: 'New password',
			SUBMIT: 'Change password',
		},
		RESET_PASSWORD: {
			TITLE: 'Reset password',
			DESCRIPTION: 'Enter your email and we will send you a link to reset your password.',
			EMAIL_LABEL: 'Email address',
			SUBMIT: 'Send reset link',
			BACK_TO_LOGIN: 'Back to sign in',
			CONFIRMATION: 'If an account exists for that email, a password-reset link has been sent. Check your inbox.',
		},
		RESET_PASSWORD_CONFIRM: {
			TITLE: 'Set a new password',
			DESCRIPTION: 'Choose a new password for your account.',
			NEW_PASSWORD_LABEL: 'New password',
			SUBMIT: 'Reset password',
			MISSING_TOKEN: 'This reset link is invalid or incomplete. Please request a new one.',
		},
		ERRORS: {
			INVALID_CREDENTIALS: 'Email or password is incorrect',
			OLD_PASSWORD_MISMATCH: 'Your current password is incorrect',
			RESET_TOKEN_INVALID: 'This reset link is invalid or has expired. Please request a new one.',
			ACCOUNT_LOCKED:
				'Your account has been temporarily locked due to multiple failed attempts. Please try again later.',
			ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
			ACCOUNT_DELETED: 'This account no longer exists.',
			TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
			TOKEN_INVALID: 'Invalid session. Please log in again.',
			GENERIC: 'Login error. Please try again.',
			ACCOUNT_LOCKED_UNTIL: 'Too many failed attempts — try again in {time}',
			RATE_LIMITED_UNTIL: 'Too many requests — try again in {time}',
		},
	},
	LANDING: {
		PAGE_TITLE: 'Welcome',
		BRAND_NAME: 'Angular Nx Starter',
		HERO_HEADING: 'Angular + Nx SSR Starter',
		HERO_SUBHEADING:
			'A production-ready starter with authentication, role-based access control, and server-side rendering built in.',
		HERO_CTA: 'Get started',
		LOGIN_BUTTON: 'Sign in',
		SKIP_TO_CONTENT: 'Skip to main content',
		FEATURES: {
			TITLE: "What's included",
			AUTH_TITLE: 'Authentication',
			AUTH_DESCRIPTION: 'Secure PASETO-based authentication with token refresh and session management.',
			RBAC_TITLE: 'Role-based access control',
			RBAC_DESCRIPTION: 'Granular permissions with roles, enforced at both the route and API level.',
			SSR_TITLE: 'Server-side rendering',
			SSR_DESCRIPTION: 'Angular SSR out of the box for faster first paint and better SEO.',
		},
	},
	COMMON: {
		LOADING: 'Loading...',
		CANCEL: 'Cancel',
		SAVE: 'Save',
		SAVING: 'Saving...',
		CREATE: 'Create',
		CREATING: 'Creating...',
		EDIT: 'Edit',
		DELETE: 'Delete',
		DISCARD: 'Discard',
		CONFIRM: 'Confirm',
		DISCARD_DIALOG: {
			TITLE: 'Discard changes',
			MESSAGE: 'You have unsaved changes. Are you sure you want to discard them?',
			CONFIRM: 'Discard',
		},
		LOGOUT: 'Logout',
		STATUS: {
			ACTIVE: 'Active',
			DISABLED: 'Disabled',
			DELETED: 'Deleted',
		},
	},
	USERS: {
		PAGE: {
			NAV: 'Users',
			TITLE: 'Users',
			DESCRIPTION: 'Manage system users, their roles, and account status.',
			SEARCH: 'Search users...',
			CREATE_BUTTON: 'Create User',
			RESET_PASSWORD_BUTTON: 'Reset Password',
			DELETE_DIALOG: {
				TITLE: 'Delete User',
				MESSAGE: "Are you sure you want to delete the user '{name}'? This action cannot be undone.",
			},
			RESET_PASSWORD_DIALOG: {
				TITLE: 'Reset Password',
				MESSAGE:
					"Are you sure you want to reset the password for '{email}'? A new temporary password will be emailed to the user, who will be required to change it on next login.",
			},
		},
		TABLE: {
			CAPTION: 'Users list',
			HEADER: {
				NAME: 'Name',
				EMAIL: 'Email',
				STATUS: 'Status',
				ROLES: 'Roles',
			},
		},
		CREATE_DRAWER: {
			TITLE: 'Create User',
			FIRST_NAME: 'First Name',
			LAST_NAME: 'Last Name',
			EMAIL: 'Email',
			MUST_CHANGE_PASSWORD: 'Must change password on first login',
			ROLES_LABEL: 'Roles',
			SUCCESS_TOAST: 'User created successfully.',
		},
		DETAIL: {
			TITLE: 'User Details',
			BACK: 'Back to Users',
			PROFILE: {
				TITLE: 'Profile',
				FIRST_NAME: 'First Name',
				LAST_NAME: 'Last Name',
				EMAIL: 'Email',
				SAVE: 'Save changes',
				SUCCESS_TOAST: 'User updated successfully.',
			},
			ROLES: {
				TITLE: 'Roles',
				EMPTY: 'No roles assigned',
				EDIT_BUTTON: 'Edit roles',
				DRAWER_TITLE: 'Edit Roles',
				ROLES_LABEL: 'Roles',
				SUCCESS_TOAST: 'Roles updated successfully.',
			},
			ACCOUNT: {
				TITLE: 'Account Actions',
				RESET_PASSWORD: 'Send password reset link',
				DISABLE: 'Disable user',
				ENABLE: 'Enable user',
				DISABLE_DIALOG: {
					TITLE: 'Disable User',
					MESSAGE: "Are you sure you want to disable '{name}'? They will be unable to sign in until re-enabled.",
				},
				ENABLE_DIALOG: {
					TITLE: 'Enable User',
					MESSAGE: "Are you sure you want to enable '{name}'? They will regain access to sign in.",
				},
				DISABLE_TOAST: 'User disabled successfully.',
				ENABLE_TOAST: 'User enabled successfully.',
			},
			DANGER: {
				TITLE: 'Danger Zone',
				DESCRIPTION: 'Irreversible and destructive actions.',
				DELETE: 'Delete user',
			},
		},
		DELETE_TOAST: 'User deleted successfully.',
		RESET_PASSWORD_TOAST: 'Password reset. The temporary password is being emailed to the user.',
	},
	ROLES: {
		PAGE: {
			NAV: 'Roles',
			TITLE: 'Roles',
			DESCRIPTION: 'Manage system roles and their associated permissions.',
			SEARCH: 'Search roles...',
			CREATE_BUTTON: 'Create Role',
			DELETE_DIALOG: {
				TITLE: 'Delete Role',
				MESSAGE: "Are you sure you want to delete the role '{name}'? This action cannot be undone.",
			},
		},
		TABLE: {
			CAPTION: 'Roles list',
			HEADER: {
				NAME: 'Name',
				CODE: 'Code',
				DESCRIPTION: 'Description',
			},
		},
		CREATE_DRAWER: {
			TITLE: 'Create Role',
			NAME: 'Name',
			CODE: 'Code',
			CODE_HINT: 'Auto-generated from name',
			DESCRIPTION: 'Description',
			PERMISSIONS: 'Permissions',
			SUCCESS_TOAST: 'Role created successfully.',
		},
		EDIT_DRAWER: {
			TITLE: 'Edit Role',
			NAME: 'Name',
			CODE: 'Code',
			CODE_HINT: 'Code cannot be changed',
			DESCRIPTION: 'Description',
			PERMISSIONS: 'Permissions',
			SUCCESS_TOAST: 'Role updated successfully.',
		},
		DELETE_TOAST: 'Role deleted successfully.',
	},
	PERMISSIONS: {
		PAGE: {
			NAV: 'Permissions',
			TITLE: 'Permissions',
			DESCRIPTION_INTRO: 'View all system permissions organized by resource. Each identifier follows the',
			DESCRIPTION_PATTERN: 'pattern.',
		},
		TABLE: {
			CAPTION: 'Permissions grouped by resource',
			HEADER: {
				RESOURCE: 'Resource',
				ACTION: 'Action',
				IDENTIFIER: 'Identifier',
				DESCRIPTION: 'Description',
			},
		},
		ERRORS: {
			ACCESS_DENIED: "You don't have permission to access that page.",
		},
	},
	SETTINGS: {
		NAV: 'Settings',
		TITLE: 'Settings',
		DESCRIPTION: 'Configure your application preferences.',
		LANGUAGE: {
			LABEL: 'Language',
			ENGLISH: 'English',
			SPANISH: 'Spanish',
		},
	},
	HEALTH: {
		NAV: 'Health',
		TITLE: 'Application Health Checker',
		LOADING: 'Loading...',
		STATUS_LABEL: 'Status:',
		DATE_TIME_LABEL: 'Date & Time:',
		CHECKS_HEADER: 'Checks',
		ERROR_TITLE: 'Error:',
		DATABASE: {
			HEADER: 'Database',
			STATUS: 'Status:',
			RESPONSE_TIME: 'Response Time:',
		},
	},
	DASHBOARD: {
		BREADCRUMB: 'Dashboard',
		SECTIONS: {
			SETTINGS: 'Settings & Maintenance',
			ADMIN: 'Administration',
		},
		HOME: {
			NO_ACCESS_TITLE: 'No module access',
			NO_ACCESS_MESSAGE:
				"Your account doesn't have access to any modules yet. Contact your administrator to request the permissions you need.",
			DESCRIPTIONS: {
				SETTINGS: 'Configure your application preferences and language.',
				HEALTH: 'Monitor the health and status of your application services.',
				USERS: 'Manage user accounts, their roles, and access permissions.',
				AUTHORIZATION: 'Manage roles and permissions that control access to the platform.',
			},
		},
		AUTHORIZATION: {
			NAV: 'Authorization',
			TITLE: 'Authorization',
			ROLES_CARD: {
				NAME: 'Roles',
				DESCRIPTION: 'Define roles and assign permissions to control access across the platform.',
			},
			PERMISSIONS_CARD: {
				NAME: 'Permissions',
				DESCRIPTION: 'View and manage the granular permission definitions available in the system.',
			},
		},
	},
	HTTP: {
		ERRORS: {
			FORBIDDEN: "You don't have permission to perform this action",
		},
	},
	DATA_TABLE: {
		EMPTY: 'No data available',
		LOADING: 'Loading...',
		TOGGLE: {
			TABLE: 'Table view',
			CARDS: 'Card view',
			GROUP_LABEL: 'Display mode',
		},
	},
	ROW_ACTIONS: {
		TRIGGER_LABEL: 'Actions',
	},
	PAGINATION: {
		LABEL: 'Pagination',
		ROWS_PER_PAGE: 'Rows per page',
		GO_TO_PREVIOUS: 'Go to previous page',
		GO_TO_NEXT: 'Go to next page',
		GO_TO_PAGE: 'Go to page {page}',
		PAGE_OF: 'Page {current} of {total}',
	},
	VALIDATION: {
		REQUIRED: 'This field is required',
		EMAIL: 'Please enter a valid email address',
		MIN_LENGTH: 'Must be at least {min} characters',
		MAX_LENGTH: 'Must be no more than {max} characters',
		MIN: 'Must be at least {min}',
		MAX: 'Must be no more than {max}',
		PATTERN: 'Invalid format',
	},
}

export default en
