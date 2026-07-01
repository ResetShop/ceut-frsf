import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { PageShell } from '@components/page-shell/page-shell'
import type { IPermission } from '@domain/access/permission.interface'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Badge } from '@resetshop/ui/badge/badge'
import { DataTable } from '@resetshop/ui/data-table/data-table'
import { DataTableCardDef } from '@resetshop/ui/data-table/data-table-card-def'
import { DataTableCellDef } from '@resetshop/ui/data-table/data-table-cell-def'
import { PermissionsStore } from '@store/permissions/permissions.store'
import type { ColumnDef } from '@tanstack/angular-table'
import { PermissionCard } from './permission-card'

@Component({
	selector: 'app-permissions-list',
	standalone: true,
	imports: [Badge, DataTable, DataTableCardDef, DataTableCellDef, PageShell, PermissionCard, TranslatePipe],
	template: `
		<app-page-shell
			[loading]="store.isLoading()"
			[error]="store.readError().list"
			[title]="'PERMISSIONS.PAGE.TITLE' | translate"
		>
			<p pageDescription>
				{{ 'PERMISSIONS.PAGE.DESCRIPTION_INTRO' | translate }}
				<span class="font-mono text-gray-700 dark:text-gray-300">module:resource:action</span>
				{{ 'PERMISSIONS.PAGE.DESCRIPTION_PATTERN' | translate }}
			</p>

			<app-data-table
				[columns]="columns"
				[data]="store.permissions()"
				[loading]="store.isLoading()"
				[grouping]="grouping"
				[caption]="'PERMISSIONS.TABLE.CAPTION' | translate"
				[displayModes]="displayModes"
				cardsBelow="sm"
				tabBleed="4"
			>
				<ng-template appDataTableCellDef="identifier" let-value>
					<span appBadge variant="secondary">{{ value }}</span>
				</ng-template>

				<ng-template appDataTableCardDef let-row>
					<app-permission-card [permission]="row" />
				</ng-template>
			</app-data-table>
		</app-page-shell>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PermissionsList {
	protected readonly store = inject(PermissionsStore)
	protected readonly displayModes: Array<'table' | 'cards'> = ['table', 'cards']

	private readonly translation = inject(Translation)

	protected readonly columns: ColumnDef<IPermission, unknown>[] = [
		{ accessorKey: 'resource', header: this.translation.instant('PERMISSIONS.TABLE.HEADER.RESOURCE') },
		{ accessorKey: 'action', header: this.translation.instant('PERMISSIONS.TABLE.HEADER.ACTION') },
		{ accessorKey: 'identifier', header: this.translation.instant('PERMISSIONS.TABLE.HEADER.IDENTIFIER') },
		{ accessorKey: 'description', header: this.translation.instant('PERMISSIONS.TABLE.HEADER.DESCRIPTION') },
	]

	protected readonly grouping = ['resource']
}
