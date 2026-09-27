import { NgTemplateOutlet } from '@angular/common'
import {
	Component,
	computed,
	contentChild,
	contentChildren,
	effect,
	inject,
	input,
	isDevMode,
	linkedSignal,
	output,
	signal,
	type Signal,
} from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherGrid, featherTable } from '@ng-icons/feather-icons'
import { createBreakpointSignal, type BreakpointName } from '@resetshop/angular-core/breakpoint/breakpoint'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import {
	createAngularTable,
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	type ColumnDef,
	type ExpandedState,
	type Row,
	type SortingState,
	type Updater,
} from '@tanstack/angular-table'

import { Button } from '../button/button'
import { Spinner } from '../spinner/spinner'
import { DataTableCardDef } from './data-table-card-def'
import { DataTableCellDef } from './data-table-cell-def'

export interface DataTableSortEvent {
	id: string
	direction: 'asc' | 'desc'
}

export type DataTableDisplayMode = 'table' | 'cards'

/**
 * Tailwind spacing scale values supported for the display-mode toggle "bleed-out" effect.
 * Must match the parent layout's horizontal padding (e.g., `'4'` for a parent with `p-4`).
 * Strings are intentional — they participate in static Tailwind class names below.
 */
export type DataTableTabBleed = '0' | '2' | '4' | '6' | '8'

@Component({
	selector: 'app-data-table',
	standalone: true,
	imports: [Button, NgIcon, NgTemplateOutlet, Spinner],
	viewProviders: [provideIcons({ featherTable, featherGrid })],
	host: {
		'[class.display-cards]': "resolvedDisplayMode() === 'cards'",
	},
	templateUrl: './data-table.html',
	styles: `
		:host {
			display: block;
		}
	`,
})
export class DataTable<T> {
	private readonly translation = inject(Translation)

	/** TanStack column definitions */
	public readonly columns = input<ColumnDef<T, unknown>[]>([])

	/** Data rows */
	public readonly data = input<T[]>([])

	/** Whether data is loading */
	public readonly loading = input<boolean>(false)

	/**
	 * Visual display mode (seed value for the active mode).
	 *
	 * - `'table'` (default): renders a standard `<table>` with rows and columns.
	 * - `'cards'`: renders a vertical list of cards using the projected
	 *   `appDataTableCardDef` template. Falls back to `'table'` when no card
	 *   template is projected — see `resolvedDisplayMode`.
	 *
	 * This input seeds `activeDisplayMode`. The user can override via the
	 * toggle control (when `displayModes` has more than one entry) and the
	 * parent can override via `[(displayMode)]` two-way binding.
	 */
	public readonly displayMode = input<DataTableDisplayMode>('table')

	/** Fired when the active display mode changes (via the toggle control). */
	public readonly displayModeChange = output<DataTableDisplayMode>()

	/**
	 * Auto-switch to card mode when the viewport is narrower than the given
	 * Tailwind breakpoint. Set to `null` (default) to disable responsive
	 * switching.
	 *
	 * Only effective when an `appDataTableCardDef` template is projected.
	 * Switching between breakpoints (e.g. `'sm'` → `'lg'`) at runtime works
	 * correctly — each breakpoint has a pre-wired observer and `cardsBelowMatches`
	 * routes reactively. What is resolved once at construction is the CSS custom
	 * property read used to build each media query string.
	 */
	public readonly cardsBelow = input<BreakpointName | null>(null)

	/**
	 * Display modes the consumer wants enabled. When this array has more than
	 * one entry and a card template is projected, the component renders a
	 * toggle button group in the top-right corner. Defaults to `['table']` —
	 * no toggle, table-only.
	 */
	public readonly displayModes = input<DataTableDisplayMode[]>(['table'])

	/**
	 * Opt-in horizontal "bleed-out" for the display-mode toggle row so the
	 * underlying horizontal rule extends through the parent layout's padding gaps
	 * (producing a tab-attached-to-body look).
	 *
	 * Set to the parent's horizontal padding scale value (e.g., `'4'` when the
	 * parent uses `p-4`). The component applies `-mx-{n}` on the wrapper and
	 * `w-{n}` on the right spacer so the rule terminates flush with the parent's
	 * outer edge. Default `null` — no bleed; toggle renders with neutral spacing.
	 *
	 * Only effective when the toggle is visible (`displayModes` length > 1 and a
	 * card template is projected).
	 */
	public readonly tabBleed = input<DataTableTabBleed | null>(null)

	/**
	 * Message shown when data is empty.
	 *
	 * Defaults to the translated `DATA_TABLE.EMPTY` key, resolved once at construction.
	 * The translation is not reactive — if the application language changes at runtime,
	 * the component must be re-created to pick up the new locale.
	 */
	public readonly emptyMessage = input<string>(this.translation.instant('DATA_TABLE.EMPTY', 'No data available'))

	/** Accessible table caption */
	public readonly caption = input<string>('')

	/** Column IDs to group by (empty = no grouping) */
	public readonly grouping = input<string[]>([])

	/** Whether grouped rows start expanded (default: true) */
	public readonly expandedByDefault = input<boolean>(true)

	protected readonly loadingMessage = this.translation.instant('DATA_TABLE.LOADING', 'Loading...')
	protected readonly toggleTableLabel = this.translation.instant('DATA_TABLE.TOGGLE.TABLE', 'Table view')
	protected readonly toggleCardsLabel = this.translation.instant('DATA_TABLE.TOGGLE.CARDS', 'Card view')
	protected readonly toggleGroupLabel = this.translation.instant('DATA_TABLE.TOGGLE.GROUP_LABEL', 'Display mode')

	/** Emits when sort changes */
	public readonly sortChange = output<DataTableSortEvent>()

	/** Internal sorting state */
	private readonly sorting = signal<SortingState>([])

	/** Internal expanded state — resets to `expandedByDefault` when the input changes */
	private readonly expanded = linkedSignal<boolean, ExpandedState>({
		source: this.expandedByDefault,
		computation: (expandedByDefault) => (expandedByDefault ? true : {}),
	})

	/**
	 * Per-breakpoint signals — subscribed eagerly so the component can react to a
	 * dynamic `cardsBelow` binding without re-wiring its observers. Negligible cost
	 * (three MediaQueryList listeners). SSR safety is handled inside
	 * `createBreakpointSignal`, which short-circuits to a constant `false` signal on
	 * non-browser platforms.
	 */
	private readonly smMatches: Signal<boolean> = createBreakpointSignal('sm')
	private readonly mdMatches: Signal<boolean> = createBreakpointSignal('md')
	private readonly lgMatches: Signal<boolean> = createBreakpointSignal('lg')

	/** Resolves the active breakpoint signal based on the current `cardsBelow` input. */
	private readonly cardsBelowMatches = computed<boolean>(() => {
		const bp = this.cardsBelow()
		if (bp === 'sm') return this.smMatches()
		if (bp === 'md') return this.mdMatches()
		if (bp === 'lg') return this.lgMatches()
		return false
	})

	/**
	 * Active display mode: starts from `displayMode()` (re-seeds when the parent
	 * input changes) and can be overridden by the toggle. The breakpoint signal
	 * does not directly mutate this — it influences `resolvedDisplayMode` instead,
	 * so a user's explicit toggle action wins over the responsive default.
	 */
	protected readonly activeDisplayMode = linkedSignal<DataTableDisplayMode>(() => this.displayMode())

	/**
	 * Tracks whether the user has explicitly chosen a mode via the toggle.
	 * Re-seeded from `displayMode()` so a parent re-assignment clears the flag and
	 * the responsive `cardsBelow` rule takes over again.
	 */
	private readonly userOverrideActive = linkedSignal<DataTableDisplayMode, boolean>({
		source: this.displayMode,
		computation: () => false,
	})

	/** TanStack table instance */
	protected readonly table = createAngularTable(() => {
		const groupingState = this.grouping()
		const isGrouped = groupingState.length > 0

		const baseOptions = {
			data: this.data(),
			columns: this.columns(),
			state: { sorting: this.sorting() },
			onSortingChange: (updater: Updater<SortingState>) => this.handleSortingUpdate(updater),
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
		}

		if (!isGrouped) return baseOptions

		return {
			...baseOptions,
			state: {
				...baseOptions.state,
				grouping: groupingState,
				expanded: this.expanded(),
			},
			onExpandedChange: (updater: Updater<ExpandedState>) => this.handleExpandedUpdate(updater),
			getGroupedRowModel: getGroupedRowModel(),
			getExpandedRowModel: getExpandedRowModel(),
			groupedColumnMode: false as const,
		}
	})

	/** Column count for colspan in empty/loading states */
	protected readonly columnCount = computed(() => this.columns().length)

	/** Custom card template definition projected as content (single, optional) */
	private readonly cardDef = contentChild(DataTableCardDef)

	/**
	 * Resolved display mode.
	 *
	 * Precedence (highest to lowest):
	 *   1. User's explicit toggle action (mutates `activeDisplayMode`)
	 *   2. Parent's `[displayMode]` input (re-seeds `activeDisplayMode`)
	 *   3. Responsive breakpoint (`cardsBelow`) when `activeDisplayMode` is the default `'table'`
	 *
	 * Always falls back to `'table'` when no card template is projected.
	 */
	protected readonly resolvedDisplayMode = computed<DataTableDisplayMode>(() => {
		const active = this.activeDisplayMode()
		const hasCard = this.cardDef() != null
		if (!hasCard) return 'table'
		if (this.userOverrideActive()) return active
		if (active === 'cards') return 'cards'
		if (this.cardsBelow() != null && this.cardsBelowMatches()) return 'cards'
		return 'table'
	})

	/** Template reference for the projected card definition (read by the template) */
	protected readonly cardDefTemplate = computed(() => this.cardDef()?.template ?? null)

	/** Negative-margin class for the toggle wrapper, or empty string when `tabBleed` is `null`. */
	protected readonly tabBleedWrapperClass = computed(() => {
		const bleed = this.tabBleed()
		const wrapperClasses: Record<DataTableTabBleed, string> = {
			'0': 'mx-0',
			'2': '-mx-2',
			'4': '-mx-4',
			'6': '-mx-6',
			'8': '-mx-8',
		}
		return bleed == null ? '' : wrapperClasses[bleed]
	})

	/** Width class for the right spacer, or `'w-0'` when `tabBleed` is `null` (collapses the spacer). */
	protected readonly tabBleedSpacerClass = computed(() => {
		const bleed = this.tabBleed()
		const spacerClasses: Record<DataTableTabBleed, string> = {
			'0': 'w-0',
			'2': 'w-2',
			'4': 'w-4',
			'6': 'w-6',
			'8': 'w-8',
		}
		return bleed == null ? 'w-0' : spacerClasses[bleed]
	})

	/**
	 * Whether the display-mode toggle should be visible.
	 *
	 * Requires more than one mode in `displayModes`, the `'cards'` mode to be
	 * one of them, and a card template projected — otherwise switching to
	 * card mode would have no effect.
	 */
	protected readonly showToggle = computed(() => {
		const modes = this.displayModes()
		return modes.length > 1 && modes.includes('cards') && this.cardDef() != null
	})

	/** Custom cell template definitions projected as content */
	private readonly cellDefs = contentChildren(DataTableCellDef)

	/** Map of column ID → cell template definition */
	protected readonly cellDefMap = computed(() => {
		const map = new Map<string, DataTableCellDef>()
		for (const def of this.cellDefs()) {
			map.set(def.appDataTableCellDef(), def)
		}
		return map
	})

	/** Map TanStack sort direction to WAI-ARIA `aria-sort` values */
	protected resolveAriaSort(direction: false | 'asc' | 'desc'): 'ascending' | 'descending' | null {
		if (direction === 'asc') return 'ascending'
		if (direction === 'desc') return 'descending'
		return null
	}

	/** Resolve sort direction to a visual indicator character (↑, ↓, or ↕) */
	protected resolveSortIndicator(direction: false | 'asc' | 'desc'): string {
		if (direction === 'asc') return '↑'
		if (direction === 'desc') return '↓'
		return '↕'
	}

	/**
	 * Resolve header definition to a display string.
	 *
	 * TanStack Table header definitions are polymorphic (string | function | component).
	 * Parameters are typed as `unknown` because the generic boundary erases the concrete
	 * type — runtime type checking via `typeof` is the intended resolution strategy.
	 *
	 * - `string` → returned as-is
	 * - `function` → called with `context`, result coerced to string
	 * - other → returns empty string (component headers not supported)
	 */
	protected renderHeader(headerDef: unknown, context: unknown): string {
		if (typeof headerDef === 'string') return headerDef
		if (typeof headerDef === 'function') return String(headerDef(context))
		return ''
	}

	protected readonly groupIndentPx = 16

	/** Resolve the group label for a grouped row, coercing the unknown cell value to string */
	protected resolveGroupLabel(row: Row<T>): string {
		if (!row.getIsGrouped()) return ''
		const columnId = row.groupingColumnId ?? this.grouping()[0]
		return String(row.getValue(columnId))
	}

	protected handleToggle(mode: DataTableDisplayMode): void {
		this.userOverrideActive.set(true)
		this.activeDisplayMode.set(mode)
		this.displayModeChange.emit(mode)
	}

	private readonly validateGroupingEffect = isDevMode()
		? effect(() => {
				const groupingIds = this.grouping()
				if (groupingIds.length === 0) return

				const columnIds = new Set<string>()
				for (const col of this.columns()) {
					const id = col.id ?? ('accessorKey' in col ? (col.accessorKey as string) : undefined)
					if (id) columnIds.add(id)
				}

				for (const id of groupingIds) {
					if (!columnIds.has(id)) {
						console.warn(`DataTable: grouping column "${id}" does not match any column definition.`)
					}
				}
			})
		: undefined

	private handleExpandedUpdate(updater: Updater<ExpandedState>): void {
		const newExpanded = typeof updater === 'function' ? updater(this.expanded()) : updater
		this.expanded.set(newExpanded)
	}

	private handleSortingUpdate(updater: Updater<SortingState>): void {
		const newSorting = typeof updater === 'function' ? updater(this.sorting()) : updater
		this.sorting.set(newSorting)
		if (newSorting.length > 0) {
			this.sortChange.emit({
				id: newSorting[0].id,
				direction: newSorting[0].desc ? 'desc' : 'asc',
			})
		}
	}
}
