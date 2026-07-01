import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	signal,
	untracked,
	viewChild,
} from '@angular/core'
import {
	email as emailValidator,
	form,
	maxLength,
	required,
	schema,
	FormField as SignalFormField,
} from '@angular/forms/signals'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmDialog } from '@resetshop/ui/confirm-dialog/confirm-dialog'
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

interface CreateUserFormModel {
	email: string
	firstName: string
	lastName: string
	roleIds: number[]
	mustChangePassword: boolean
}

// Module-level for readability — mirrors the roles drawer pattern (used by model.set and onDrawerClosed)
const EMPTY_MODEL: CreateUserFormModel = {
	email: '',
	firstName: '',
	lastName: '',
	roleIds: [],
	mustChangePassword: true,
}

@Component({
	selector: 'app-create-user-drawer',
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
		ConfirmDialog,
		TranslatePipe,
	],
	template: `
		<app-drawer
			(closed)="onDrawerClosed()"
			(afterClosed)="toast.flushPending()"
			[closeOnBackdrop]="false"
			[title]="'USERS.CREATE_DRAWER.TITLE' | translate"
			class="w-full sm:w-lg"
			#drawer
		>
			<form (submit)="onSubmit($event)" id="create-user-form" class="flex h-full flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				<app-form-field [label]="'USERS.CREATE_DRAWER.FIRST_NAME' | translate">
					<input [formField]="userForm.firstName" type="text" autocomplete="given-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.CREATE_DRAWER.LAST_NAME' | translate">
					<input [formField]="userForm.lastName" type="text" autocomplete="family-name" />
				</app-form-field>

				<app-form-field [label]="'USERS.CREATE_DRAWER.EMAIL' | translate">
					<input [formField]="userForm.email" type="email" autocomplete="email" />
				</app-form-field>

				<app-form-field [label]="'USERS.CREATE_DRAWER.MUST_CHANGE_PASSWORD' | translate">
					<input [formField]="userForm.mustChangePassword" type="checkbox" />
				</app-form-field>

				@if (rolesStore.allRoles().length > 0) {
					<app-form-field [label]="'USERS.CREATE_DRAWER.ROLES_LABEL' | translate" class="flex min-h-0 flex-1 flex-col">
						<app-role-selector [formField]="userForm.roleIds" [roles]="rolesStore.allRoles()" />
					</app-form-field>
				}
			</form>

			<ng-template appDrawerFooter>
				<div class="flex justify-end gap-3">
					<button (click)="onCancel()" appButton variant="outline">{{ 'COMMON.CANCEL' | translate }}</button>
					<button [disabled]="showSubmitSpinner() || !isFormValid()" appButton type="submit" form="create-user-form">
						@if (showSubmitSpinner()) {
							<app-spinner data-icon="start" />
						}
						{{ showSubmitSpinner() ? ('COMMON.CREATING' | translate) : ('COMMON.CREATE' | translate) }}
					</button>
				</div>
			</ng-template>
		</app-drawer>

		<app-confirm-dialog
			(confirmed)="drawer.close()"
			[title]="'COMMON.DISCARD_DIALOG.TITLE' | translate"
			[message]="'COMMON.DISCARD_DIALOG.MESSAGE' | translate"
			[confirmText]="'COMMON.DISCARD_DIALOG.CONFIRM' | translate"
			confirmVariant="destructive"
			#discardDialog
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserDrawer {
	private readonly usersStore = inject(UsersStore)
	protected readonly rolesStore = inject(RolesStore)
	private readonly translation = inject(Translation)
	protected readonly drawer = viewChild.required<Drawer>('drawer')
	private readonly discardDialog = viewChild.required<ConfirmDialog>('discardDialog')

	protected readonly toast = createMutationToast(this.translation.instant('USERS.CREATE_DRAWER.SUCCESS_TOAST'), {
		deferred: true,
	})

	private readonly model = signal<CreateUserFormModel>({ ...EMPTY_MODEL })
	protected readonly userForm = form(
		this.model,
		schema<CreateUserFormModel>((user) => {
			required(user.email)
			emailValidator(user.email)
			required(user.firstName)
			maxLength(user.firstName, 100)
			required(user.lastName)
			maxLength(user.lastName, 100)
		}),
	)

	protected readonly isFormValid = computed(() => this.userForm().errors().length === 0)
	protected readonly isCreating = computed(() => this.usersStore.isCreating())
	private readonly closingAfterSuccess = signal(false)
	protected readonly showSubmitSpinner = computed(() => this.isCreating() || this.closingAfterSuccess())
	protected readonly mutationError = computed(() => this.usersStore.mutationError().create)

	private readonly closeOnSuccessEffect = effect(() => this.closeOnSuccess())

	private closeOnSuccess(): void {
		const creating = this.usersStore.isCreating()
		const error = this.usersStore.mutationError().create
		untracked(() => {
			if (this.toast.handleResult(creating, error) === 'success') {
				this.closingAfterSuccess.set(true)
				setTimeout(() => {
					this.closingAfterSuccess.set(false)
					this.drawer().close()
				}, parseDurationToMs(DRAWER_CLOSE_AFTER_SUCCESS_DELAY))
			}
		})
	}

	public open(): void {
		this.rolesStore.loadAllRoles()
		this.drawer().show()
		this.drawer().setContentReady()
	}

	protected onCancel(): void {
		if (this.userForm().dirty()) {
			this.discardDialog().show()
		} else {
			this.drawer().close()
		}
	}

	protected onDrawerClosed(): void {
		this.model.set({ ...EMPTY_MODEL })
		this.userForm().reset()
		this.usersStore.clearMutationError('create')
	}

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid()) return

		const { email, firstName, lastName, roleIds, mustChangePassword } = this.model()
		this.toast.markSubmitted()
		this.usersStore.createUser({
			email,
			firstName,
			lastName,
			roleIds: roleIds.length ? roleIds : undefined,
			mustChangePassword,
		})
	}
}
