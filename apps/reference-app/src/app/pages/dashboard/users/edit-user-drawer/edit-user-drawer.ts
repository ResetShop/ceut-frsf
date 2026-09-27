import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core'
import {
	email as emailValidator,
	form,
	maxLength,
	required,
	schema,
	FormField as SignalFormField,
} from '@angular/forms/signals'
import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import { UserStatus } from '@contracts/user/user.constants'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { computeUserEditDiff, type UserEditDiff, type UserEditFormModel } from '@domain/user-management/user-edit-diff'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmChangesDialog } from '@resetshop/ui/confirm-changes-dialog/confirm-changes-dialog'
import { Drawer } from '@resetshop/ui/drawer/drawer'
import { DrawerFooter } from '@resetshop/ui/drawer/drawer-footer'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { Select } from '@resetshop/ui/select/select'
import { Spinner } from '@resetshop/ui/spinner/spinner'
import { parseDurationToMs } from '@resetshop/util'
import { AuthStore } from '@store/auth/auth.store'
import { RolesStore } from '@store/roles/roles.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { UsersStore } from '@store/users/users.store'
import { DRAWER_CLOSE_AFTER_SUCCESS_DELAY } from '../../dashboard.constants'
import { RoleSelector } from '../role-selector/role-selector'
import { UserStatusBadge } from '../user-status-badge/user-status-badge'
import { toConfirmChangesEntries } from './user-edit-changes.presenter'

/**
 * Single edit surface for a managed user's profile, roles, and status. Submitting never persists
 * directly: it opens a before → after confirmation of every changed field, and only a confirmed
 * edit is sent — as one request that the backend applies atomically.
 *
 * The user to edit is passed to `open(user)`, so one instance can serve every row of a list as well
 * as a detail page.
 */
@Component({
	selector: 'app-edit-user-drawer',
	standalone: true,
	imports: [
		Drawer,
		DrawerFooter,
		FormField,
		SignalFormField,
		Select,
		Button,
		Spinner,
		RoleSelector,
		UserStatusBadge,
		ConfirmChangesDialog,
		Alert,
		AlertDescription,
		TranslatePipe,
	],
	template: `
		<app-drawer
			(closed)="onDrawerClosed()"
			(afterClosed)="toast.flushPending()"
			[closeOnBackdrop]="false"
			[title]="'USERS.DETAIL.EDIT.DRAWER_TITLE' | translate"
			class="w-full sm:w-lg"
			#drawer
		>
			<form (submit)="onSubmit($event)" id="edit-user-form" class="flex h-full flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				<app-form-field [label]="'USERS.DETAIL.PROFILE.FIRST_NAME' | translate">
					<input [formField]="userForm.firstName" type="text" autocomplete="given-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.DETAIL.PROFILE.LAST_NAME' | translate">
					<input [formField]="userForm.lastName" type="text" autocomplete="family-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.DETAIL.PROFILE.EMAIL' | translate">
					<input [formField]="userForm.email" type="email" autocomplete="email" />
				</app-form-field>

				@if (canEditStatus()) {
					<app-form-field [label]="'USERS.DETAIL.EDIT.STATUS_LABEL' | translate">
						<app-select [formField]="userForm.status" [options]="statusOptions()" />
					</app-form-field>
				} @else if (user(); as editedUser) {
					<div class="flex flex-col items-start gap-1.5">
						<span class="text-foreground text-sm font-medium">{{ 'USERS.DETAIL.EDIT.STATUS_LABEL' | translate }}</span>
						<app-user-status-badge [status]="editedUser.status" />
					</div>
				}

				@if (rolesStore.allRoles().length > 0) {
					<app-form-field [label]="'USERS.DETAIL.ROLES.TITLE' | translate" class="flex min-h-0 flex-1 flex-col">
						<app-role-selector
							[formField]="userForm.roleIds"
							[roles]="rolesStore.allRoles()"
							[lockedRoleIds]="lockedRoleIds()"
						/>
					</app-form-field>
				}
			</form>

			<ng-template appDrawerFooter>
				<div class="flex justify-end gap-3">
					<button (click)="drawer.close()" appButton variant="outline">{{ 'COMMON.CANCEL' | translate }}</button>
					<button
						[disabled]="showSubmitSpinner() || !isFormValid() || !hasChanges()"
						type="submit"
						form="edit-user-form"
						appButton
					>
						@if (showSubmitSpinner()) {
							<app-spinner data-icon="start" />
						}
						{{ showSubmitSpinner() ? ('COMMON.SAVING' | translate) : ('USERS.DETAIL.EDIT.REVIEW' | translate) }}
					</button>
				</div>
			</ng-template>
		</app-drawer>

		<app-confirm-changes-dialog
			(confirmed)="onChangesConfirmed()"
			[title]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.TITLE' | translate"
			[message]="confirmMessage()"
			[changes]="confirmEntries()"
			[beforeLabel]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.BEFORE' | translate"
			[afterLabel]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.AFTER' | translate"
			[confirmText]="'USERS.DETAIL.EDIT.CONFIRM_DIALOG.CONFIRM' | translate"
			[cancelText]="'COMMON.CANCEL' | translate"
		/>
	`,
})
export class EditUserDrawer {
	/** The user being edited; set by `open()`. */
	protected readonly user = signal<IManagedUser | null>(null)

	private readonly usersStore = inject(UsersStore)
	protected readonly rolesStore = inject(RolesStore)
	private readonly authStore = inject(AuthStore)
	private readonly translation = inject(Translation)
	private readonly currentUser = inject(CurrentUser)
	private readonly drawer = viewChild.required<Drawer>('drawer')
	private readonly confirmDialog = viewChild.required(ConfirmChangesDialog)

	/**
	 * Status is editable only with `admin:users:disable` and never on your own account (self-lockout).
	 * Otherwise it is shown as a read-only label and never enters the diff or the request.
	 */
	protected readonly canEditStatus = computed(() => {
		const user = this.user()
		return !!user && !this.currentUser.is(user) && !!this.authStore.currentUser()?.hasPermission('admin:users:disable')
	})

	/**
	 * Roles that cannot be deselected. When an admin edits their OWN account, their admin role is locked
	 * on so they cannot remove it and lock themselves out. The backend enforces the same rule.
	 */
	protected readonly lockedRoleIds = computed(() => {
		const user = this.user()
		if (!user || !this.currentUser.is(user)) {
			return []
		}
		const adminRole = user.roles.find((role) => role.code === ADMIN_ROLE_CODE)
		return adminRole ? [adminRole.id] : []
	})

	protected readonly statusOptions = computed(() => [
		{ value: UserStatus.ACTIVE, label: this.translation.instant('COMMON.STATUS.ACTIVE') },
		{ value: UserStatus.DISABLED, label: this.translation.instant('COMMON.STATUS.DISABLED') },
	])

	protected readonly toast = createMutationToast(this.translation.instant('USERS.DETAIL.EDIT.SUCCESS_TOAST'), {
		deferred: true,
	})

	private readonly model = signal<UserEditFormModel>({
		email: '',
		firstName: '',
		lastName: '',
		roleIds: [],
		status: UserStatus.ACTIVE,
	})
	protected readonly userForm = form(
		this.model,
		schema<UserEditFormModel>((user) => {
			required(user.email)
			emailValidator(user.email)
			required(user.firstName)
			maxLength(user.firstName, 100)
			required(user.lastName)
			maxLength(user.lastName, 100)
		}),
	)

	private readonly diff = computed<UserEditDiff>(() => {
		const user = this.user()
		if (!user) {
			return { patch: {}, changes: {} }
		}
		const edited = this.canEditStatus() ? this.model() : { ...this.model(), status: user.status }
		const roleNames = new Map(this.rolesStore.allRoles().map((role) => [role.id, role.name]))
		return computeUserEditDiff(user, edited, roleNames)
	})

	protected readonly isFormValid = computed(() => this.userForm().valid())
	protected readonly hasChanges = computed(() => Object.keys(this.diff().changes).length > 0)
	protected readonly confirmEntries = computed(() =>
		toConfirmChangesEntries(this.diff().changes, (key) => this.translation.instant(key)),
	)
	protected readonly confirmMessage = computed(() =>
		this.translation.instant('USERS.DETAIL.EDIT.CONFIRM_DIALOG.MESSAGE').replace('{name}', this.user()?.fullName ?? ''),
	)

	private readonly closingAfterSuccess = signal(false)
	protected readonly showSubmitSpinner = computed(() => this.usersStore.isUpdating() || this.closingAfterSuccess())
	protected readonly mutationError = computed(() => this.usersStore.mutationError().update)

	// Marks drawer content ready once roles have loaded.
	private readonly contentReadyEffect = effect(() => {
		if (this.rolesStore.allRoles().length > 0) {
			untracked(() => this.drawer().setContentReady())
		}
	})

	private readonly closeOnSuccessEffect = effect(() => this.closeOnSuccess())

	public open(user: IManagedUser): void {
		this.user.set(user)
		this.model.set({
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			roleIds: user.roles.map((role) => role.id),
			status: user.status,
		})
		this.userForm().reset()
		this.rolesStore.loadAllRoles()
		this.drawer().show()
	}

	protected onDrawerClosed(): void {
		this.usersStore.clearMutationError('update')
	}

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid() || !this.hasChanges()) return
		this.confirmDialog().show()
	}

	protected onChangesConfirmed(): void {
		const user = this.user()
		if (!user) return
		this.toast.markSubmitted()
		this.usersStore.updateUser({ id: user.id, body: this.diff().patch })
	}

	private closeOnSuccess(): void {
		const updating = this.usersStore.isUpdating()
		const error = this.usersStore.mutationError().update
		untracked(() => {
			if (this.toast.handleResult(updating, error) === 'success') {
				this.closingAfterSuccess.set(true)
				setTimeout(() => {
					this.closingAfterSuccess.set(false)
					this.drawer().close()
				}, parseDurationToMs(DRAWER_CLOSE_AFTER_SUCCESS_DELAY))
			}
		})
	}
}
