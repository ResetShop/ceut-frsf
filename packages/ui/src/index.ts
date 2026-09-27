// @resetshop/ui — Generic UI components
// Consumers should prefer deep imports for tree-shaking: '@resetshop/ui/button/button'
// This root export provides the most commonly used symbols for convenience.

export { Alert } from './lib/alert/alert'
export { Badge, type BadgeVariant } from './lib/badge/badge'
export { Button } from './lib/button/button'
export { default as Card } from './lib/card/card'
export { Combobox } from './lib/combobox/combobox'
export { ConfirmChangesDialog, type ConfirmChangesEntry } from './lib/confirm-changes-dialog/confirm-changes-dialog'
export { ConfirmDialog } from './lib/confirm-dialog/confirm-dialog'
export {
	DataTable,
	type DataTableDisplayMode,
	type DataTableSortEvent,
	type DataTableTabBleed,
} from './lib/data-table/data-table'
export { DataTableCardDef, type DataTableCardDefContext } from './lib/data-table/data-table-card-def'
export { DataTableCellDef, type DataTableCellDefContext } from './lib/data-table/data-table-cell-def'
export { Drawer } from './lib/drawer/drawer'
export { FormField } from './lib/form-field/form-field'
export { FormFieldCustomControl } from './lib/form-field/form-field-custom-control'
export { default as ImmersivePanel } from './lib/immersive-panel/immersive-panel'
export { LoadingSpinnerComponent } from './lib/loading-spinner/loading-spinner.component'
export { default as NavigationCard } from './lib/navigation-card/navigation-card'
export { Pagination } from './lib/pagination/pagination'
export { Select } from './lib/select/select'
export type { SelectOption } from './lib/select/select-option'
export { Spinner } from './lib/spinner/spinner'
// Toast components remain in the app — they depend on UIStore
export { RowActionsMenu } from './lib/row-actions-menu/row-actions-menu'
export type { RowAction, RowActionsInput } from './lib/row-actions-menu/row-actions-menu'
