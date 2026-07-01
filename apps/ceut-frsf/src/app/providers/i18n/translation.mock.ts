import { Injectable, makeEnvironmentProviders } from '@angular/core'
import type { Language } from '@resetshop/angular-core/i18n/translation'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import type { TranslationKey } from '@resetshop/angular-core/i18n/translations.schema'

/**
 * Common translation keys used across page specs for data tables, pagination, and validation.
 */
export const MOCK_TRANSLATIONS: Record<string, string> = {
	// Data table & pagination
	'DATA_TABLE.EMPTY': 'No data available',
	'DATA_TABLE.LOADING': 'Loading...',
	'DATA_TABLE.TOGGLE.TABLE': 'Table view',
	'DATA_TABLE.TOGGLE.CARDS': 'Card view',
	'DATA_TABLE.TOGGLE.GROUP_LABEL': 'Display mode',
	'ROW_ACTIONS.TRIGGER_LABEL': 'Actions',
	'PAGINATION.LABEL': 'Pagination',
	'PAGINATION.ROWS_PER_PAGE': 'Rows per page',
	'PAGINATION.GO_TO_PREVIOUS': 'Previous page',
	'PAGINATION.GO_TO_NEXT': 'Next page',
	'PAGINATION.GO_TO_PAGE': 'Go to page {page}',
	'PAGINATION.PAGE_OF': 'Page {current} of {total}',
	'VALIDATION.REQUIRED': 'This field is required',
	'VALIDATION.EMAIL': 'Please enter a valid email address',
	'VALIDATION.MIN_LENGTH': 'Must be at least {min} characters',
	'VALIDATION.MAX_LENGTH': 'Maximum {max} characters',
	'VALIDATION.MIN': 'Must be at least {min}',
	'VALIDATION.MAX': 'Must be no more than {max}',
	'VALIDATION.PATTERN': 'Invalid format',

	// Auth
	'AUTH.LOGIN.TITLE': 'Sign in to your account',
	'AUTH.LOGIN.EMAIL_LABEL': 'Email address',
	'AUTH.LOGIN.PASSWORD_LABEL': 'Password',
	'AUTH.LOGIN.FORGOT_PASSWORD': 'Forgot your password?',
	'AUTH.LOGIN.SUBMIT': 'Sign in',
	'AUTH.RESET_PASSWORD.TITLE': 'Reset password',
	'AUTH.RESET_PASSWORD.EMAIL_LABEL': 'Email address',
	'AUTH.RESET_PASSWORD.SUBMIT': 'Send reset link',
	'AUTH.RESET_PASSWORD.BACK_TO_LOGIN': 'Back to sign in',
	'AUTH.RESET_PASSWORD.DESCRIPTION': 'Enter your email and we will send you a link to reset your password.',
	'AUTH.RESET_PASSWORD.CONFIRMATION':
		'If an account exists for that email, a password-reset link has been sent. Check your inbox.',
	'AUTH.RESET_PASSWORD_CONFIRM.TITLE': 'Set a new password',
	'AUTH.RESET_PASSWORD_CONFIRM.DESCRIPTION': 'Choose a new password for your account.',
	'AUTH.RESET_PASSWORD_CONFIRM.NEW_PASSWORD_LABEL': 'New password',
	'AUTH.RESET_PASSWORD_CONFIRM.SUBMIT': 'Reset password',
	'AUTH.RESET_PASSWORD_CONFIRM.MISSING_TOKEN': 'This reset link is invalid or incomplete. Please request a new one.',
	'AUTH.CHANGE_PASSWORD.TITLE': 'Change your password',
	'AUTH.CHANGE_PASSWORD.DESCRIPTION': 'For your security, set a new password before continuing.',
	'AUTH.CHANGE_PASSWORD.OLD_PASSWORD_LABEL': 'Current password',
	'AUTH.CHANGE_PASSWORD.NEW_PASSWORD_LABEL': 'New password',
	'AUTH.CHANGE_PASSWORD.SUBMIT': 'Change password',
	'AUTH.ERRORS.OLD_PASSWORD_MISMATCH': 'Your current password is incorrect',
	'AUTH.ERRORS.RESET_TOKEN_INVALID': 'This reset link is invalid or has expired. Please request a new one.',
	'AUTH.ERRORS.GENERIC': 'Login error. Please try again.',
	'AUTH.ERRORS.ACCOUNT_LOCKED':
		'Your account has been temporarily locked due to multiple failed attempts. Please try again later.',
	'AUTH.ERRORS.ACCOUNT_LOCKED_UNTIL': 'Too many failed attempts — try again in {time}',
	'AUTH.ERRORS.RATE_LIMITED_UNTIL': 'Too many requests — try again in {time}',

	// Landing
	'LANDING.PAGE_TITLE': 'Welcome',
	'LANDING.BRAND_NAME': 'Angular Nx Starter',
	'LANDING.HERO_HEADING': 'Angular + Nx SSR Starter',
	'LANDING.HERO_SUBHEADING':
		'A production-ready starter with authentication, role-based access control, and server-side rendering built in.',
	'LANDING.HERO_CTA': 'Get started',
	'LANDING.LOGIN_BUTTON': 'Sign in',
	'LANDING.SKIP_TO_CONTENT': 'Skip to main content',
	'LANDING.FEATURES.TITLE': "What's included",
	'LANDING.FEATURES.AUTH_TITLE': 'Authentication',
	'LANDING.FEATURES.AUTH_DESCRIPTION': 'Secure PASETO-based authentication with token refresh and session management.',
	'LANDING.FEATURES.RBAC_TITLE': 'Role-based access control',
	'LANDING.FEATURES.RBAC_DESCRIPTION': 'Granular permissions with roles, enforced at both the route and API level.',
	'LANDING.FEATURES.SSR_TITLE': 'Server-side rendering',
	'LANDING.FEATURES.SSR_DESCRIPTION': 'Angular SSR out of the box for faster first paint and better SEO.',

	// Common
	'COMMON.LOADING': 'Loading...',
	'COMMON.CANCEL': 'Cancel',
	'COMMON.SAVE': 'Save',
	'COMMON.SAVING': 'Saving...',
	'COMMON.CREATE': 'Create',
	'COMMON.CREATING': 'Creating...',
	'COMMON.EDIT': 'Edit',
	'COMMON.DELETE': 'Delete',
	'COMMON.DISCARD': 'Discard',
	'COMMON.CONFIRM': 'Confirm',
	'COMMON.DISCARD_DIALOG.TITLE': 'Discard changes',
	'COMMON.DISCARD_DIALOG.MESSAGE': 'You have unsaved changes. Are you sure you want to discard them?',
	'COMMON.DISCARD_DIALOG.CONFIRM': 'Discard',
	'COMMON.STATUS.ACTIVE': 'Active',
	'COMMON.STATUS.DISABLED': 'Disabled',
	'COMMON.STATUS.DELETED': 'Deleted',

	// Users
	'USERS.PAGE.TITLE': 'Users',
	'USERS.PAGE.DESCRIPTION': 'Manage system users, their roles, and account status.',
	'USERS.PAGE.SEARCH': 'Search users...',
	'USERS.PAGE.CREATE_BUTTON': 'Create User',
	'USERS.PAGE.RESET_PASSWORD_BUTTON': 'Reset Password',
	'USERS.PAGE.DELETE_DIALOG.TITLE': 'Delete User',
	'USERS.PAGE.DELETE_DIALOG.MESSAGE':
		"Are you sure you want to delete the user '{name}'? This action cannot be undone.",
	'USERS.PAGE.RESET_PASSWORD_DIALOG.TITLE': 'Reset Password',
	'USERS.PAGE.RESET_PASSWORD_DIALOG.MESSAGE':
		"Are you sure you want to reset the password for '{email}'? A new temporary password will be emailed to the user, who will be required to change it on next login.",
	'USERS.TABLE.CAPTION': 'Users list',
	'USERS.TABLE.HEADER.NAME': 'Name',
	'USERS.TABLE.HEADER.EMAIL': 'Email',
	'USERS.TABLE.HEADER.STATUS': 'Status',
	'USERS.TABLE.HEADER.ROLES': 'Roles',
	'USERS.CREATE_DRAWER.TITLE': 'Create User',
	'USERS.CREATE_DRAWER.FIRST_NAME': 'First Name',
	'USERS.CREATE_DRAWER.LAST_NAME': 'Last Name',
	'USERS.CREATE_DRAWER.EMAIL': 'Email',
	'USERS.CREATE_DRAWER.MUST_CHANGE_PASSWORD': 'Must change password on first login',
	'USERS.CREATE_DRAWER.ROLES_LABEL': 'Roles',
	'USERS.CREATE_DRAWER.SUCCESS_TOAST': 'User created successfully.',
	'USERS.DETAIL.TITLE': 'User Details',
	'USERS.DETAIL.BACK': 'Back to Users',
	'USERS.DETAIL.PROFILE.TITLE': 'Profile',
	'USERS.DETAIL.PROFILE.FIRST_NAME': 'First Name',
	'USERS.DETAIL.PROFILE.LAST_NAME': 'Last Name',
	'USERS.DETAIL.PROFILE.EMAIL': 'Email',
	'USERS.DETAIL.PROFILE.SAVE': 'Save changes',
	'USERS.DETAIL.PROFILE.SUCCESS_TOAST': 'User updated successfully.',
	'USERS.DETAIL.ROLES.TITLE': 'Roles',
	'USERS.DETAIL.ROLES.EMPTY': 'No roles assigned',
	'USERS.DETAIL.ROLES.EDIT_BUTTON': 'Edit roles',
	'USERS.DETAIL.ROLES.DRAWER_TITLE': 'Edit Roles',
	'USERS.DETAIL.ROLES.ROLES_LABEL': 'Roles',
	'USERS.DETAIL.ROLES.SUCCESS_TOAST': 'Roles updated successfully.',
	'USERS.DETAIL.ACCOUNT.TITLE': 'Account Actions',
	'USERS.DETAIL.ACCOUNT.RESET_PASSWORD': 'Send password reset link',
	'USERS.DETAIL.ACCOUNT.DISABLE': 'Disable user',
	'USERS.DETAIL.ACCOUNT.ENABLE': 'Enable user',
	'USERS.DETAIL.ACCOUNT.DISABLE_DIALOG.TITLE': 'Disable User',
	'USERS.DETAIL.ACCOUNT.DISABLE_DIALOG.MESSAGE':
		"Are you sure you want to disable '{name}'? They will be unable to sign in until re-enabled.",
	'USERS.DETAIL.ACCOUNT.ENABLE_DIALOG.TITLE': 'Enable User',
	'USERS.DETAIL.ACCOUNT.ENABLE_DIALOG.MESSAGE':
		"Are you sure you want to enable '{name}'? They will regain access to sign in.",
	'USERS.DETAIL.ACCOUNT.DISABLE_TOAST': 'User disabled successfully.',
	'USERS.DETAIL.ACCOUNT.ENABLE_TOAST': 'User enabled successfully.',
	'USERS.DETAIL.DANGER.TITLE': 'Danger Zone',
	'USERS.DETAIL.DANGER.DESCRIPTION': 'Irreversible and destructive actions.',
	'USERS.DETAIL.DANGER.DELETE': 'Delete user',
	'USERS.DELETE_TOAST': 'User deleted successfully.',
	'USERS.RESET_PASSWORD_TOAST': 'Password reset. The temporary password is being emailed to the user.',

	// Roles
	'ROLES.PAGE.TITLE': 'Roles',
	'ROLES.PAGE.DESCRIPTION': 'Manage system roles and their associated permissions.',
	'ROLES.PAGE.SEARCH': 'Search roles...',
	'ROLES.PAGE.CREATE_BUTTON': 'Create Role',
	'ROLES.PAGE.DELETE_DIALOG.TITLE': 'Delete Role',
	'ROLES.PAGE.DELETE_DIALOG.MESSAGE':
		"Are you sure you want to delete the role '{name}'? This action cannot be undone.",
	'ROLES.TABLE.CAPTION': 'Roles list',
	'ROLES.TABLE.HEADER.NAME': 'Name',
	'ROLES.TABLE.HEADER.CODE': 'Code',
	'ROLES.TABLE.HEADER.DESCRIPTION': 'Description',
	'ROLES.CREATE_DRAWER.TITLE': 'Create Role',
	'ROLES.CREATE_DRAWER.NAME': 'Name',
	'ROLES.CREATE_DRAWER.CODE': 'Code',
	'ROLES.CREATE_DRAWER.CODE_HINT': 'Auto-generated from name',
	'ROLES.CREATE_DRAWER.DESCRIPTION': 'Description',
	'ROLES.CREATE_DRAWER.PERMISSIONS': 'Permissions',
	'ROLES.CREATE_DRAWER.SUCCESS_TOAST': 'Role created successfully.',
	'ROLES.EDIT_DRAWER.TITLE': 'Edit Role',
	'ROLES.EDIT_DRAWER.NAME': 'Name',
	'ROLES.EDIT_DRAWER.CODE': 'Code',
	'ROLES.EDIT_DRAWER.CODE_HINT': 'Code cannot be changed',
	'ROLES.EDIT_DRAWER.DESCRIPTION': 'Description',
	'ROLES.EDIT_DRAWER.PERMISSIONS': 'Permissions',
	'ROLES.EDIT_DRAWER.SUCCESS_TOAST': 'Role updated successfully.',
	'ROLES.DELETE_TOAST': 'Role deleted successfully.',

	// Permissions
	'PERMISSIONS.PAGE.TITLE': 'Permissions',
	'PERMISSIONS.TABLE.CAPTION': 'Permissions grouped by resource',
	'PERMISSIONS.TABLE.HEADER.RESOURCE': 'Resource',
	'PERMISSIONS.TABLE.HEADER.ACTION': 'Action',
	'PERMISSIONS.TABLE.HEADER.IDENTIFIER': 'Identifier',
	'PERMISSIONS.TABLE.HEADER.DESCRIPTION': 'Description',

	// Health
	'HEALTH.TITLE': 'Application Health Checker',
	'HEALTH.LOADING': 'Loading...',
	'HEALTH.STATUS_LABEL': 'Status:',
	'HEALTH.DATE_TIME_LABEL': 'Date & Time:',
	'HEALTH.CHECKS_HEADER': 'Checks',
	'HEALTH.ERROR_TITLE': 'Error:',
	'HEALTH.DATABASE.HEADER': 'Database',
	'HEALTH.DATABASE.STATUS': 'Status:',
	'HEALTH.DATABASE.RESPONSE_TIME': 'Response Time:',

	// Settings
	'SETTINGS.TITLE': 'Settings',
	'SETTINGS.DESCRIPTION': 'Configure your application preferences.',
	'SETTINGS.LANGUAGE.LABEL': 'Language',
	'SETTINGS.LANGUAGE.ENGLISH': 'English',
	'SETTINGS.LANGUAGE.SPANISH': 'Spanish',
	'SETTINGS.NAV': 'Settings',

	// Common extras
	'COMMON.LOGOUT': 'Logout',
	'DASHBOARD.BREADCRUMB': 'Dashboard',
}

/**
 * Lightweight translation stub for component specs.
 * Looks up the key in MOCK_TRANSLATIONS; returns the raw key for unrecognised keys.
 * If an assertion needs a translated value, add the key to MOCK_TRANSLATIONS above.
 */
export const mockTranslation = {
	instant: (key: string, fallback?: string) => MOCK_TRANSLATIONS[key] ?? fallback ?? key,
}

@Injectable({ providedIn: 'root' })
export class TranslationMock extends Translation {
	public override instant(key: TranslationKey, fallback?: string): string {
		return MOCK_TRANSLATIONS[key] ?? fallback ?? key
	}

	public override async loadDefaultLanguage(): Promise<void> {
		// No-op — mock does not load translation files
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface contract requires the parameter
	public override async setLanguage(_lang: Language): Promise<void> {
		// No-op
	}

	public override getCurrentLanguage(): Language {
		return 'en'
	}
}

export function provideTranslationMock() {
	return makeEnvironmentProviders([{ provide: Translation, useClass: TranslationMock }])
}
