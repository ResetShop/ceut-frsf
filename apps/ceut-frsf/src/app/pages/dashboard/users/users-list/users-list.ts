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
import { Router } from '@angular/router'
import { PageShell } from '@components/page-shell/page-shell'
import { HasPermissionDirective } from '@directives/has-permission.directive'
import type { IManagedUser } from '@domain/user-management/managed-user.interface'
import { CurrentUser } from '@resetshop/angular-core/auth/current-user'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '@resetshop/ui/button/button'
import { ConfirmDialog } from '@resetshop/ui/confirm-dialog/confirm-dialog'
import { DataTable } from '@resetshop/ui/data-table/data-table'
import { DataTableCardDef } from '@resetshop/ui/data-table/data-table-card-def'
import { DataTableCellDef } from '@resetshop/ui/data-table/data-table-cell-def'
import { Pagination } from '@resetshop/ui/pagination/pagination'
import { type RowAction } from '@resetshop/ui/row-actions-menu/row-action-item'
import { RowActionsMenu } from '@resetshop/ui/row-actions-menu/row-actions-menu'
import { AuthStore } from '@store/auth/auth.store'
import { createMutationToast } from '@store/ui/mutation-toast'
import { UsersStore } from '@store/users/users.store'
import type { ColumnDef } from '@tanstack/angular-table'
import { CreateUserDrawer } from '../create-user-drawer/create-user-drawer'
import { UserStatusBadge } from '../user-status-badge/user-status-badge'
import { UserCard } from './user-card'

@Component({
	selector: 'app-users-list',
	standalone: true,
	imports: [
		Button,
		ConfirmDialog,
		CreateUserDrawer,
		DataTable,
		DataTableCardDef,
		DataTableCellDef,
		HasPermissionDirective,
		PageShell,
		Pagination,
		RowActionsMenu,
		TranslatePipe,
		UserCard,
		UserStatusBadge,
	],
	template: `
		<app-page-shell
			[loading]="store.isLoadingList()"
			[error]="store.readError().list"
			[title]="'USERS.PAGE.TITLE' | translate"
		>
			<p pageDescription>{{ 'USERS.PAGE.DESCRIPTION' | translate }}</p>

			<div
				pageActionsSkeleton
				class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
				data-testid="users-actions-skeleton"
			>
				<div class="bg-muted h-9 w-full max-w-sm animate-pulse rounded-md"></div>
				<div class="bg-muted h-9 w-full animate-pulse rounded-md sm:w-24"></div>
			</div>

			<div
				pageActions
				class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
			>
				<input
					(input)="onSearchInput($event)"
					[placeholder]="'USERS.PAGE.SEARCH' | translate"
					type="search"
					class="border-input bg-background text-foreground focus:border-ring focus:ring-ring h-9 w-full max-w-sm rounded-md border px-3 text-base focus:ring-1 focus:outline-none sm:text-sm"
				/>
				<button (click)="createDrawer.open()" *hasPermission="'admin:users:create'" appButton class="w-full sm:w-auto">
					{{ 'USERS.PAGE.CREATE_BUTTON' | translate }}
				</button>
			</div>

			<app-data-table
				[columns]="columns()"
				[data]="store.users()"
				[loading]="store.isMutating()"
				[caption]="'USERS.TABLE.CAPTION' | translate"
				[displayModes]="displayModes"
				cardsBelow="sm"
				tabBleed="4"
			>
				<ng-template appDataTableCellDef="status" let-value>
					<app-user-status-badge [status]="value" />
				</ng-template>

				<ng-template appDataTableCellDef="actions" let-row="row">
					<app-row-actions-menu
						[actions]="getRowActions(row)"
						[triggerLabel]="'ROW_ACTIONS.TRIGGER_LABEL' | translate"
					/>
				</ng-template>

				<ng-template appDataTableCardDef let-row>
					<app-user-card
						(edit)="goToDetail(row)"
						(delete)="confirmDelete(row)"
						(resetPassword)="confirmResetPassword(row)"
						[user]="row"
					/>
				</ng-template>
			</app-data-table>

			@if (store.totalPages() > 1) {
				<app-pagination
					(pageChange)="store.setPage($event)"
					(pageSizeChange)="store.setPageSize($event)"
					[currentPage]="store.currentPage()"
					[totalPages]="store.totalPages()"
					[pageSize]="store.pageSize()"
				/>
			}
		</app-page-shell>

		<app-create-user-drawer #createDrawer />

		<app-confirm-dialog
			(confirmed)="onDeleteConfirmed()"
			[message]="deleteMessage()"
			[title]="'USERS.PAGE.DELETE_DIALOG.TITLE' | translate"
			[confirmText]="'COMMON.DELETE' | translate"
			#deleteDialog
			confirmVariant="destructive"
		/>

		<app-confirm-dialog
			(confirmed)="onResetPasswordConfirmed()"
			[message]="resetPasswordMessage()"
			[title]="'USERS.PAGE.RESET_PASSWORD_DIALOG.TITLE' | translate"
			[confirmText]="'USERS.PAGE.RESET_PASSWORD_BUTTON' | translate"
			#resetPasswordDialog
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UsersList {
	protected readonly store = inject(UsersStore)
	protected readonly displayModes: Array<'table' | 'cards'> = ['table', 'cards']

	private readonly authStore = inject(AuthStore)
	private readonly translation = inject(Translation)
	private readonly router = inject(Router)
	protected readonly currentUser = inject(CurrentUser)

	private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog')
	private readonly deleteToast = createMutationToast(this.translation.instant('USERS.DELETE_TOAST'))

	protected readonly userToDelete = signal<IManagedUser | null>(null)
	protected readonly deleteMessage = computed(() => {
		const name = this.userToDelete()?.fullName ?? ''
		return this.translation.instant('USERS.PAGE.DELETE_DIALOG.MESSAGE').replace('{name}', name)
	})

	private readonly deleteToastEffect = effect(() => {
		const deleting = this.store.isDeleting()
		const error = this.store.mutationError().delete
		untracked(() => this.deleteToast.handleResult(deleting, error))
	})

	private readonly resetPasswordDialog = viewChild.required<ConfirmDialog>('resetPasswordDialog')
	private readonly resetPasswordToast = createMutationToast(this.translation.instant('USERS.RESET_PASSWORD_TOAST'))

	protected readonly userToResetPassword = signal<IManagedUser | null>(null)
	protected readonly resetPasswordMessage = computed(() => {
		const email = this.userToResetPassword()?.email ?? ''
		return this.translation.instant('USERS.PAGE.RESET_PASSWORD_DIALOG.MESSAGE').replace('{email}', email)
	})

	private readonly resetPasswordToastEffect = effect(() => {
		const resetting = this.store.isResettingPassword()
		const error = this.store.mutationError().resetPassword
		untracked(() => this.resetPasswordToast.handleResult(resetting, error))
	})

	protected readonly columns = computed((): ColumnDef<IManagedUser, unknown>[] => {
		const base: ColumnDef<IManagedUser, unknown>[] = [
			{ accessorKey: 'fullName', header: this.translation.instant('USERS.TABLE.HEADER.NAME') },
			{ accessorKey: 'email', header: this.translation.instant('USERS.TABLE.HEADER.EMAIL') },
			{ accessorKey: 'status', header: this.translation.instant('USERS.TABLE.HEADER.STATUS') },
			{
				id: 'roles',
				header: this.translation.instant('USERS.TABLE.HEADER.ROLES'),
				accessorFn: (row) => (row.roles.length ? row.roles.map((r) => r.name).join(', ') : '—'),
			},
		]
		const user = this.authStore.currentUser()
		if (
			user?.hasPermission('admin:users:update') ||
			user?.hasPermission('admin:users:delete') ||
			user?.hasPermission('admin:users:reset_password')
		) {
			return [...base, { id: 'actions', header: '', enableSorting: false }]
		}
		return base
	})

	protected onSearchInput(event: Event): void {
		const input = event.target as HTMLInputElement
		this.store.setSearchQuery(input.value)
	}

	protected goToDetail(user: IManagedUser): void {
		void this.router.navigate(['/dashboard/users', user.id])
	}

	protected getRowActions(row: IManagedUser): readonly (readonly RowAction[])[] {
		const user = this.authStore.currentUser()
		const isSelf = this.currentUser.is(row)
		const nonDestructive: RowAction[] = []

		if (user?.hasPermission('admin:users:update')) {
			nonDestructive.push({
				label: this.translation.instant('COMMON.EDIT'),
				onSelect: () => this.goToDetail(row),
			})
		}

		if (!isSelf && user?.hasPermission('admin:users:reset_password')) {
			nonDestructive.push({
				label: this.translation.instant('USERS.PAGE.RESET_PASSWORD_BUTTON'),
				onSelect: () => this.confirmResetPassword(row),
			})
		}

		const destructive: RowAction[] = []

		if (!isSelf && user?.hasPermission('admin:users:delete')) {
			destructive.push({
				label: this.translation.instant('COMMON.DELETE'),
				onSelect: () => this.confirmDelete(row),
				variant: 'destructive',
			})
		}

		return [nonDestructive, destructive]
	}

	protected confirmDelete(user: IManagedUser): void {
		this.userToDelete.set(user)
		this.deleteDialog().show()
	}

	protected onDeleteConfirmed(): void {
		const user = this.userToDelete()
		if (user) {
			this.deleteToast.markSubmitted()
			this.store.deleteUser(user.id)
			this.userToDelete.set(null)
		}
	}

	protected confirmResetPassword(user: IManagedUser): void {
		this.userToResetPassword.set(user)
		this.resetPasswordDialog().show()
	}

	protected onResetPasswordConfirmed(): void {
		const user = this.userToResetPassword()
		if (user) {
			this.resetPasswordToast.markSubmitted()
			this.store.resetPassword(user.id)
			this.userToResetPassword.set(null)
		}
	}
}
