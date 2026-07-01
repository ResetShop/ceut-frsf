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
import { parseDurationToMs } from '@resetshop/util'
import { PermissionsStore } from '@store/permissions/permissions.store'
import { RolesStore } from '@store/roles/roles.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { DRAWER_CLOSE_AFTER_SUCCESS_DELAY } from '../../dashboard.constants'
import { PermissionSelector } from '../permission-selector/permission-selector'

interface EditRoleFormModel {
	name: string
	code: string
	description: string
	permissionIds: number[]
}

const EMPTY_MODEL: EditRoleFormModel = { name: '', code: '', description: '', permissionIds: [] }

@Component({
	selector: 'app-edit-role-drawer',
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
			[title]="'ROLES.EDIT_DRAWER.TITLE' | translate"
			class="w-full sm:w-lg"
			#drawer
		>
			<form (submit)="onSubmit($event)" id="edit-role-form" class="flex h-full flex-col gap-4">
				@if (mutationError()) {
					<div appAlert variant="destructive">
						<p appAlertDescription>{{ mutationError() }}</p>
					</div>
				}

				<app-form-field [label]="'ROLES.EDIT_DRAWER.NAME' | translate">
					<input [formField]="roleForm.name" type="text" autocomplete="off" />
				</app-form-field>

				<app-form-field
					[label]="'ROLES.EDIT_DRAWER.CODE' | translate"
					[hint]="'ROLES.EDIT_DRAWER.CODE_HINT' | translate"
				>
					<input [formField]="roleForm.code" type="text" />
				</app-form-field>

				<app-form-field [label]="'ROLES.EDIT_DRAWER.DESCRIPTION' | translate">
					<textarea [formField]="roleForm.description" rows="3"></textarea>
				</app-form-field>

				@if (permissionsStore.permissionsGroupedArray().length > 0) {
					<app-form-field [label]="'ROLES.EDIT_DRAWER.PERMISSIONS' | translate" class="flex min-h-0 flex-1 flex-col">
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
					<button
						[disabled]="drawer.showSpinner() || showSubmitSpinner() || !isFormValid()"
						appButton
						type="submit"
						form="edit-role-form"
					>
						@if (showSubmitSpinner()) {
							<app-spinner data-icon="start" />
						}
						{{ showSubmitSpinner() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
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
export class EditRoleDrawer {
	private readonly rolesStore = inject(RolesStore)
	protected readonly permissionsStore = inject(PermissionsStore)
	private readonly translation = inject(Translation)
	protected readonly drawer = viewChild.required<Drawer>('drawer')
	private readonly discardDialog = viewChild.required<ConfirmDialog>('discardDialog')

	protected readonly toast = createMutationToast(this.translation.instant('ROLES.EDIT_DRAWER.SUCCESS_TOAST'), {
		deferred: true,
	})

	private readonly editRoleId = signal<number | null>(null)

	private readonly model = signal<EditRoleFormModel>({ ...EMPTY_MODEL })
	protected readonly roleForm = form(
		this.model,
		schema<EditRoleFormModel>((role) => {
			required(role.name)
			required(role.code)
			maxLength(role.name, 100)
			disabled(role.code)
			maxLength(role.description, 500)
		}),
	)

	protected readonly isFormValid = computed(() => this.roleForm().errors().length === 0)
	protected readonly isUpdating = computed(() => this.rolesStore.isUpdating())
	private readonly closingAfterSuccess = signal(false)
	protected readonly showSubmitSpinner = computed(() => this.isUpdating() || this.closingAfterSuccess())
	protected readonly mutationError = computed(() => this.rolesStore.mutationError().update)

	// Populates form when selectedRole loads — editRoleId guards against stale data
	private readonly populateFormEffect = effect(() => {
		const role = this.rolesStore.selectedRole()
		if (role && role.id === this.editRoleId()) {
			this.model.set({
				name: role.name,
				code: role.code,
				description: role.description ?? '',
				permissionIds: role.permissions.map((p) => p.id),
			})
			this.drawer().setContentReady()
		}
	})

	private readonly closeOnSuccessEffect = effect(() => this.closeOnSuccess())

	private closeOnSuccess(): void {
		const updating = this.rolesStore.isUpdating()
		const error = this.rolesStore.mutationError().update
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

	public open(roleId: number): void {
		this.editRoleId.set(roleId)
		this.rolesStore.loadRole(roleId)
		this.drawer().show()
	}

	protected onCancel(): void {
		if (this.roleForm().dirty()) {
			this.discardDialog().show()
		} else {
			this.drawer().close()
		}
	}

	protected onDrawerClosed(): void {
		this.editRoleId.set(null)
		this.model.set({ ...EMPTY_MODEL })
		this.roleForm().reset()
		this.rolesStore.clearMutationError('update')
	}

	protected onSubmit(event: Event): void {
		event.preventDefault()
		if (!this.isFormValid()) return

		const id = this.editRoleId()
		if (!id) return

		const { name, description, permissionIds } = this.model()
		this.toast.markSubmitted()
		this.rolesStore.updateRoleWithPermissions({
			id,
			body: { name, description: description || undefined },
			permissionIds,
		})
	}
}
