import { Component, computed, inject, input, output } from '@angular/core'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronLeft, featherChevronRight } from '@ng-icons/feather-icons'
import { createBreakpointSignal } from '@resetshop/angular-core/breakpoint/breakpoint'
import { Translation } from '@resetshop/angular-core/i18n/translation'
import { Button } from '../button/button'
import { PaginationTracker } from './pagination-tracker'

/** Represents a page item in the pagination: a page number or an ellipsis */
interface PageItem {
	type: 'page' | 'ellipsis'
	value: number
}

@Component({
	selector: 'app-pagination',
	standalone: true,
	imports: [Button, NgIcon],
	viewProviders: [provideIcons({ featherChevronLeft, featherChevronRight })],
	template: `
		<nav [attr.aria-label]="paginationLabel" class="flex items-center justify-between gap-3 sm:gap-4">
			<!-- Rows per page selector (left) -->
			<div class="flex items-center gap-2">
				<label [attr.for]="selectId" class="text-muted-foreground sr-only text-sm sm:not-sr-only">
					{{ rowsPerPageLabel }}
				</label>
				<select
					(change)="onPageSizeChange($event)"
					[id]="selectId"
					[value]="pageSize()"
					class="border-input bg-background text-foreground focus:border-ring focus:ring-ring h-8 rounded-md border px-2 text-base focus:ring-1 focus:outline-none sm:text-sm"
				>
					@for (option of pageSizeOptions(); track option) {
						<option [value]="option" [selected]="option === pageSize()">{{ option }}</option>
					}
				</select>
			</div>

			<!-- Page navigation (right) -->
			<div class="flex items-center gap-1">
				<!-- Previous button — data-touch-target extends hit area to 44px on mobile -->
				<button
					(click)="onPrevious()"
					[disabled]="isFirstPage()"
					[attr.aria-disabled]="isFirstPage()"
					[attr.aria-label]="goToPreviousLabel"
					appButton
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					data-touch-target
				>
					<ng-icon name="featherChevronLeft" class="h-4 w-4" />
				</button>

				<!-- Current-page indicator — sr-only at all viewports; announces page changes via aria-live -->
				<span aria-atomic="true" aria-live="polite" role="status" class="sr-only">
					{{ pageOfLabel() }}
				</span>

				<!-- Page number buttons — 5 items below sm:, 7 from sm: up, via visiblePageItems() -->
				@for (item of visiblePageItems(); track $index) {
					@if (item.type === 'ellipsis') {
						<span class="text-muted-foreground flex h-8 w-8 items-center justify-center text-sm">…</span>
					} @else {
						<button
							(click)="onPageClick(item.value)"
							[variant]="item.value === currentPage() ? 'outline' : 'ghost'"
							[attr.aria-label]="getPageLabel(item.value)"
							[attr.aria-current]="item.value === currentPage() ? 'page' : null"
							appButton
							size="sm"
							class="inline-flex h-8 w-8 p-0"
						>
							{{ item.value }}
						</button>
					}
				}

				<!-- Next button — data-touch-target extends hit area to 44px on mobile -->
				<button
					(click)="onNext()"
					[disabled]="isLastPage()"
					[attr.aria-disabled]="isLastPage()"
					[attr.aria-label]="goToNextLabel"
					appButton
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					data-touch-target
				>
					<ng-icon name="featherChevronRight" class="h-4 w-4" />
				</button>
			</div>
		</nav>
	`,
})
export class Pagination {
	private readonly translation = inject(Translation)
	private readonly paginationTracker = inject(PaginationTracker)

	/** Unique ID for the select element */
	protected readonly selectId = `pagination-select-${this.paginationTracker.nextId()}`

	/** Current page number (1-based) */
	public readonly currentPage = input<number>(1)

	/** Total number of pages */
	public readonly totalPages = input<number>(1)

	/** Number of items per page */
	public readonly pageSize = input<number>(25)

	/** Available page size options */
	public readonly pageSizeOptions = input<number[]>([25, 50, 100])

	/** Emits new page number when user navigates */
	public readonly pageChange = output<number>()

	/** Emits new page size when user changes the rows per page */
	public readonly pageSizeChange = output<number>()

	protected readonly paginationLabel = this.translation.instant('PAGINATION.LABEL', 'Pagination')
	protected readonly rowsPerPageLabel = this.translation.instant('PAGINATION.ROWS_PER_PAGE', 'Rows per page')
	protected readonly goToPreviousLabel = this.translation.instant('PAGINATION.GO_TO_PREVIOUS', 'Go to previous page')
	protected readonly goToNextLabel = this.translation.instant('PAGINATION.GO_TO_NEXT', 'Go to next page')
	private readonly goToPageTemplate = this.translation.instant('PAGINATION.GO_TO_PAGE', 'Go to page {page}')
	private readonly pageOfTemplate = this.translation.instant('PAGINATION.PAGE_OF', 'Page {current} of {total}')

	/** Current-page label (e.g. "Page 5 of 10"). Read by the `sr-only` `aria-live` span — never visually shown. */
	protected readonly pageOfLabel = computed(() =>
		this.pageOfTemplate.replace('{current}', String(this.currentPage())).replace('{total}', String(this.totalPages())),
	)

	/** Whether current page is the first page */
	protected readonly isFirstPage = computed(() => this.currentPage() <= 1)

	/** Whether current page is the last page */
	protected readonly isLastPage = computed(() => this.currentPage() >= this.totalPages())

	/** True when the viewport is below the sm breakpoint (< 640 px). Drives the mobile item cap. */
	private readonly isMobile = createBreakpointSignal('sm')

	/**
	 * Desktop page items — renders a stable count of 7 items when totalPages > 7,
	 * keeping width constant across navigation. Applies from the sm breakpoint up
	 * (mobile landscape, tablet, desktop).
	 *
	 * Patterns (total > 7):
	 *  - Near start (current ≤ 4): [1, 2, 3, 4, 5, …, total]
	 *  - Middle (4 < current < total - 3): [1, …, c-1, c, c+1, …, total]
	 *  - Near end (current ≥ total - 3): [1, …, total-4, total-3, total-2, total-1, total]
	 * When totalPages ≤ 7, all pages are shown contiguously without ellipsis.
	 */
	private readonly desktopPageItems = computed<PageItem[]>(() => {
		const total = this.totalPages()
		const current = this.currentPage()

		if (total <= 7) {
			return this.range(1, total).map((n) => ({ type: 'page' as const, value: n }))
		}

		if (current <= 4) {
			return [
				...this.range(1, 5).map((n) => ({ type: 'page' as const, value: n })),
				{ type: 'ellipsis', value: -1 },
				{ type: 'page', value: total },
			]
		}

		if (current >= total - 3) {
			return [
				{ type: 'page', value: 1 },
				{ type: 'ellipsis', value: -1 },
				...this.range(total - 4, total).map((n) => ({ type: 'page' as const, value: n })),
			]
		}

		return [
			{ type: 'page', value: 1 },
			{ type: 'ellipsis', value: -1 },
			{ type: 'page', value: current - 1 },
			{ type: 'page', value: current },
			{ type: 'page', value: current + 1 },
			{ type: 'ellipsis', value: -2 },
			{ type: 'page', value: total },
		]
	})

	/**
	 * Mobile page items — renders a stable count of 5 items when totalPages > 5,
	 * always keeping the first and last pages visible. Applies below the sm breakpoint
	 * (portrait mobile, < 640 px).
	 *
	 * Patterns (total > 5):
	 *  - Near start (current ≤ 3): [1, 2, 3, …, total]
	 *  - Middle (3 < current < total - 2): [1, …, current, …, total]
	 *  - Near end (current ≥ total - 2): [1, …, total-2, total-1, total]
	 * When totalPages ≤ 5, all pages are shown contiguously without ellipsis.
	 */
	private readonly mobilePageItems = computed<PageItem[]>(() => {
		const total = this.totalPages()
		const current = this.currentPage()

		if (total <= 5) {
			return this.range(1, total).map((n) => ({ type: 'page' as const, value: n }))
		}

		if (current <= 3) {
			return [
				...this.range(1, 3).map((n) => ({ type: 'page' as const, value: n })),
				{ type: 'ellipsis', value: -1 },
				{ type: 'page', value: total },
			]
		}

		if (current >= total - 2) {
			return [
				{ type: 'page', value: 1 },
				{ type: 'ellipsis', value: -1 },
				...this.range(total - 2, total).map((n) => ({ type: 'page' as const, value: n })),
			]
		}

		return [
			{ type: 'page', value: 1 },
			{ type: 'ellipsis', value: -1 },
			{ type: 'page', value: current },
			{ type: 'ellipsis', value: -2 },
			{ type: 'page', value: total },
		]
	})

	/** Visible items: 5 below sm:, 7 from sm: up. */
	protected readonly visiblePageItems = computed<PageItem[]>(() =>
		this.isMobile() ? this.mobilePageItems() : this.desktopPageItems(),
	)

	/** Creates an array of numbers from start to end (inclusive) */
	private range(start: number, end: number): number[] {
		return Array.from({ length: end - start + 1 }, (_, i) => start + i)
	}

	/** Gets the aria-label for a page button */
	protected getPageLabel(page: number): string {
		return this.goToPageTemplate.replace('{page}', String(page))
	}

	/** Navigates to the previous page. No-op on the first page. */
	protected onPrevious(): void {
		if (!this.isFirstPage()) {
			this.pageChange.emit(this.currentPage() - 1)
		}
	}

	/** Navigates to the next page. No-op on the last page. */
	protected onNext(): void {
		if (!this.isLastPage()) {
			this.pageChange.emit(this.currentPage() + 1)
		}
	}

	/** Navigates to the specified page. No-op if it equals the current page. */
	protected onPageClick(page: number): void {
		if (page !== this.currentPage()) {
			this.pageChange.emit(page)
		}
	}

	/** Handles the page size select change and emits the new size. */
	protected onPageSizeChange(event: Event): void {
		const select = event.target as HTMLSelectElement
		const newSize = parseInt(select.value, 10)
		this.pageSizeChange.emit(newSize)
	}
}
