/**
 * Data shape for the login form fields.
 * Used as the generic parameter for signal forms `FieldTree<LoginForm>`.
 */
export interface LoginForm {
	email: string
	password: string
}

/**
 * Data shape for the change-password form fields.
 * Used as the generic parameter for signal forms `FieldTree<ChangePasswordForm>`.
 */
export interface ChangePasswordForm {
	oldPassword: string
	newPassword: string
}
