import { Directive, effect, inject, input, isDevMode, TemplateRef, ViewContainerRef } from '@angular/core'
import { isPermissionName } from '@contracts/permission/permission.constants'
import { Logger } from '@resetshop/angular-core/logger/logger.token'
import { AuthStore } from '@store/auth/auth.store'

/**
 * Structural directive that conditionally renders its host element
 * based on the current user's permissions.
 *
 * In dev mode, logs a warning if the provided identifier is not a valid
 * permission name (module:resource:action format).
 *
 * @example
 * ```html
 * <button *hasPermission="'admin:users:create'" appButton>Create User</button>
 * ```
 */
@Directive({
	// eslint-disable-next-line @angular-eslint/directive-selector -- intentional: structural directive uses *hasPermission without app prefix for clean template syntax
	selector: '[hasPermission]',
	standalone: true,
})
export class HasPermissionDirective {
	public readonly hasPermission = input.required<string>()

	private readonly authStore = inject(AuthStore)
	private readonly templateRef = inject(TemplateRef<unknown>)
	private readonly viewContainer = inject(ViewContainerRef)
	private readonly loggerService = inject(Logger)

	private hasView = false

	private readonly permissionEffect = effect(() => {
		const identifier = this.hasPermission()
		const user = this.authStore.currentUser()

		if (isDevMode() && !isPermissionName(identifier)) {
			this.loggerService.warn('HasPermission', `Invalid permission identifier: "${identifier}"`)
		}

		const permitted = user?.hasPermission(identifier) ?? false

		if (permitted && !this.hasView) {
			this.viewContainer.createEmbeddedView(this.templateRef)
			this.hasView = true
		} else if (!permitted && this.hasView) {
			this.viewContainer.clear()
			this.hasView = false
		}
	})
}
