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
import { disabled, form, maxLength, required, schema, FormField as SignalFormField } from '@angular/forms/signals'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Alert, AlertDescription } from '@resetshop/ui/alert/alert'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmDialog } from '@resetshop/ui/confirm-dialog/confirm-dialog'
import { Drawer } from '@resetshop/ui/drawer/drawer'
import { DrawerFooter } from '@resetshop/ui/drawer/drawer-footer'
import { FormField } from '@resetshop/ui/form-field/form-field'
import { Spinner } from '@resetshop/ui/spinner/spinner'
import { parseDurationToMs, toSnakeCode } from '@resetshop/util'
import { PermissionsStore } from '@store/permissions/permissions.store'
import { RolesStore } from '@store/roles/roles.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { DRAWER_CLOSE_AFTER_SUCCESS_DELAY } from '../../dashboard.constants'
import { PermissionSelector } from '../permission-selector/permission-selector'

interface CreateRoleFormModel {
	name: string
	code: string
	description: string
	permissionIds: number[]
}

const EMPTY_MODEL: CreateRoleFormModel = { name: '', code: '', description: '', permissionIds: [] }

@Component({
	selector: 'app-create-role-drawer',
	standalone: true,
	imports: [
		Drawer,
		DrawerFooter,
		FormField,
		SignalFormField,
		Button,
		Spinner,
		PermissionSelector,
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
			[title]="'ROLES.CREATE_DRAWER.TITLE' | translate"
			class="w-full sm:w-lg"
			#drawer
		>
			<form (submit)="onSubmit($event)" id="create-role-form" class="flex h-full flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				<app-form-field [label]="'ROLES.CREATE_DRAWER.NAME' | translate">
					<input [formField]="roleForm.name" type="text" autocomplete="off" />
				</app-form-field>

				<app-form-field
					[label]="'ROLES.CREATE_DRAWER.CODE' | translate"
					[hint]="'ROLES.CREATE_DRAWER.CODE_HINT' | translate"
				>
					<input [formField]="roleForm.code" type="text" />
				</app-form-field>

				<app-form-field [label]="'ROLES.CREATE_DRAWER.DESCRIPTION' | translate">
					<textarea [formField]="roleForm.description" rows="3"></textarea>
				</app-form-field>

				@if (permissionsStore.permissionsGroupedArray().length > 0) {
					<app-form-field [label]="'ROLES.CREATE_DRAWER.PERMISSIONS' | translate" class="flex min-h-0 flex-1 flex-col">
						<app-permission-selector
							[formField]="roleForm.permissionIds"
							[groups]="permissionsStore.permissionsGroupedArray()"
						/>
					</app-form-field>
				}
			</form>

			<ng-template appDrawerFooter>
				<div class="flex justify-end gap-3">
					<button (click)="onCancel()" appButton variant="outline">{{ 'COMMON.CANCEL' | translate }}</button>
					<button [disabled]="showSubmitSpinner() || !isFormValid()" appButton type="submit" form="create-role-form">
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
export class CreateRoleDrawer {
	private readonly rolesStore = inject(RolesStore)
	protected readonly permissionsStore = inject(PermissionsStore)
	private readonly translation = inject(Translation)
	protected readonly drawer = viewChild.required<Drawer>('drawer')
	private readonly discardDialog = viewChild.required<ConfirmDialog>('discardDialog')

	protected readonly toast = createMutationToast(this.translation.instant('ROLES.CREATE_DRAWER.SUCCESS_TOAST'), {
		deferred: true,
	})

	private readonly model = signal<CreateRoleFormModel>({ ...EMPTY_MODEL })
	protected readonly roleForm = form(
		this.model,
		schema<CreateRoleFormModel>((role) => {
			required(role.name)
			required(role.code)
			maxLength(role.name, 100)
			disabled(role.code)
			maxLength(role.description, 500)
		}),
	)

	protected readonly isFormValid = computed(() => this.roleForm().errors().length === 0)
	protected readonly isCreating = computed(() => this.rolesStore.isCreating())
	private readonly closingAfterSuccess = signal(false)
	private readonly nameValue = computed(() => this.model().name)
	protected readonly showSubmitSpinner = computed(() => this.isCreating() || this.closingAfterSuccess())
	protected readonly mutationError = computed(() => this.rolesStore.mutationError().create)

	private readonly syncCodeEffect = effect(() => {
		const code = toSnakeCode(this.nameValue())
		untracked(() => this.model.update((m) => ({ ...m, code })))
	})

	private readonly closeOnSuccessEffect = effect(() => this.closeOnSuccess())

	private closeOnSuccess(): void {
		const creating = this.rolesStore.isCreating()
		const error = this.rolesStore.mutationError().create
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
		this.drawer().show()
		this.drawer().setContentReady()
	}

	protected onCancel(): void {
		if (this.roleForm().dirty()) {
			this.discardDialog().show()
		} else {
			this.drawer().close()
		}
	}

	protected onDrawerClosed(): void {
		this.model.set({ ...EMPTY_MODEL })
		this.roleForm().reset()
		this.rolesStore.clearMutationError('create')
	}

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid()) return

		const { name, code, description, permissionIds } = this.model()
		this.toast.markSubmitted()
		this.rolesStore.createRoleWithPermissions({
			name,
			code,
			description: description || undefined,
			permissionIds,
		})
	}
}
