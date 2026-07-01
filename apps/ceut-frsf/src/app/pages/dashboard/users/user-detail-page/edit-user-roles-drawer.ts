import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	signal,
	untracked,
	viewChild,
} from '@angular/core'
import { form, FormField as SignalFormField } from '@angular/forms/signals'
import { ADMIN_ROLE_CODE } from '@contracts/role/role.constants'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { Drawer } from '@resetshop/ui/drawer/drawer'
import { DrawerFooter } from '@resetshop/ui/drawer/drawer-footer'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { Spinner } from '@resetshop/ui/spinner/spinner'
import { parseDurationToMs } from '@resetshop/util'
import { RolesStore } from '@store/roles/roles.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { UsersStore } from '@store/users/users.store'
import { DRAWER_CLOSE_AFTER_SUCCESS_DELAY } from '../../dashboard.constants'
import { RoleSelector } from '../role-selector/role-selector'

interface RolesFormModel {
	roleIds: number[]
}

@Component({
	selector: 'app-edit-user-roles-drawer',
	standalone: true,
	imports: [
		Drawer,
		DrawerFooter,
		FormField,
		SignalFormField,
		Button,
		Spinner,
		RoleSelector,
		Alert,
		AlertDescription,
		TranslatePipe,
	],
	template: `
		<app-drawer
			(closed)="onDrawerClosed()"
			(afterClosed)="toast.flushPending()"
			[closeOnBackdrop]="false"
			[title]="'USERS.DETAIL.ROLES.DRAWER_TITLE' | translate"
			class="w-full sm:w-lg"
			#drawer
		>
			<form (submit)="onSubmit($event)" id="edit-user-roles-form" class="flex h-full flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				@if (rolesStore.allRoles().length > 0) {
					<app-form-field [label]="'USERS.DETAIL.ROLES.ROLES_LABEL' | translate" class="flex min-h-0 flex-1 flex-col">
						<app-role-selector
							[formField]="rolesForm.roleIds"
							[roles]="rolesStore.allRoles()"
							[lockedRoleIds]="lockedRoleIds()"
						/>
					</app-form-field>
				}
			</form>

			<ng-template appDrawerFooter>
				<div class="flex justify-end gap-3">
					<button (click)="drawer.close()" appButton variant="outline">{{ 'COMMON.CANCEL' | translate }}</button>
					<button [disabled]="showSubmitSpinner()" type="submit" form="edit-user-roles-form" appButton>
						@if (showSubmitSpinner()) {
							<app-spinner data-icon="start" />
						}
						{{ showSubmitSpinner() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
					</button>
				</div>
			</ng-template>
		</app-drawer>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserRolesDrawer {
	public readonly user = input.required<IManagedUser>()

	private readonly usersStore = inject(UsersStore)
	protected readonly rolesStore = inject(RolesStore)
	private readonly translation = inject(Translation)
	private readonly currentUser = inject(CurrentUser)
	private readonly drawer = viewChild.required<Drawer>('drawer')

	/**
	 * Roles that cannot be deselected. When an admin edits their OWN roles, their admin role is locked
	 * on so they cannot remove it and lock themselves out. Empty for every other case. The backend
	 * enforces the same rule (SELF_LOCKOUT) as defense-in-depth.
	 */
	protected readonly lockedRoleIds = computed(() => {
		if (!this.currentUser.is(this.user())) {
			return []
		}
		const adminRole = this.user().roles.find((role) => role.code === ADMIN_ROLE_CODE)
		return adminRole ? [adminRole.id] : []
	})

	protected readonly toast = createMutationToast(this.translation.instant('USERS.DETAIL.ROLES.SUCCESS_TOAST'), {
		deferred: true,
	})

	private readonly model = signal<RolesFormModel>({ roleIds: [] })
	protected readonly rolesForm = form(this.model)

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

	public open(): void {
		this.model.set({ roleIds: this.user().roles.map((r) => r.id) })
		this.rolesForm().reset()
		this.rolesStore.loadAllRoles()
		this.drawer().show()
	}

	protected onDrawerClosed(): void {
		this.usersStore.clearMutationError('update')
	}

	protected onSubmit(event: Event): void {
		event.preventDefault()
		const { roleIds } = this.model()
		this.toast.markSubmitted()
		this.usersStore.updateUser({ id: this.user().id, body: { roleIds: roleIds.length ? roleIds : undefined } })
	}
}
