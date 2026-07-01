import { ChangeDetectionStrategy, Component, computed, forwardRef, input, linkedSignal, model } from '@angular/core'
import type { FormValueControl } from '@angular/forms/signals'
import type { IPermission } from '@domain/access/permission.interface'
import { FormFieldCustomControl } from '@resetshop/ui/form-field/form-field-custom-control'

export interface PermissionGroup {
	resource: string
	permissions: IPermission[]
}

@Component({
	selector: 'app-permission-selector',
	standalone: true,
	providers: [{ provide: FormFieldCustomControl, useExisting: forwardRef(() => PermissionSelector) }],
	template: `
		<div [class]="containerClasses()">
			@for (group of groups(); track group.resource) {
				<div class="mb-4">
					<label
						class="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700"
						data-touch-target
					>
						<input
							(change)="toggleResource(group)"
							[checked]="isResourceFullySelected(group)"
							[indeterminate]="isResourcePartiallySelected(group)"
							type="checkbox"
							class="border-input text-default focus:ring-ring h-4 w-4 rounded"
						/>
						<span class="text-sm font-semibold text-gray-900 dark:text-white">{{ group.resource }}</span>
					</label>
					<div class="ml-6 space-y-1">
						@for (permission of group.permissions; track permission.id) {
							<label class="flex items-center gap-2" data-touch-target>
								<input
									(change)="togglePermission(permission.id)"
									[checked]="selectedSet().has(permission.id)"
									type="checkbox"
									class="border-input text-default focus:ring-ring h-4 w-4 rounded"
								/>
								<div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
									<span class="text-sm text-gray-700 dark:text-gray-300">{{ permission.name }}</span>
									@if (permission.description) {
										<span
											class="text-xs text-gray-500 before:hidden before:content-['—_'] sm:before:inline dark:text-gray-400"
										>
											{{ permission.description }}
										</span>
									}
								</div>
							</label>
						}
					</div>
				</div>
			}
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionSelector extends FormFieldCustomControl implements FormValueControl<number[]> {
	public readonly groups = input.required<PermissionGroup[]>()
	public readonly value = model<number[]>([])

	protected readonly containerClasses = computed(() => {
		const base = 'min-h-0 flex-1 overflow-y-auto rounded-md border p-3'
		return this.ariaInvalid() ? `${base} border-destructive` : `${base} border-gray-200 dark:border-gray-700`
	})

	protected readonly selectedSet = linkedSignal<number[], Set<number>>({
		source: this.value,
		computation: (ids) => new Set(ids),
	})

	protected isResourceFullySelected(group: PermissionGroup): boolean {
		const set = this.selectedSet()
		return group.permissions.every((p) => set.has(p.id))
	}

	protected isResourcePartiallySelected(group: PermissionGroup): boolean {
		const set = this.selectedSet()
		const selected = group.permissions.filter((p) => set.has(p.id)).length
		return selected > 0 && selected < group.permissions.length
	}

	protected togglePermission(id: number): void {
		const set = new Set(this.selectedSet())
		if (set.has(id)) {
			set.delete(id)
		} else {
			set.add(id)
		}
		this.selectedSet.set(set)
		this.value.set([...set])
	}

	protected toggleResource(group: PermissionGroup): void {
		const set = new Set(this.selectedSet())
		const allSelected = this.isResourceFullySelected(group)
		for (const p of group.permissions) {
			if (allSelected) {
				set.delete(p.id)
			} else {
				set.add(p.id)
			}
		}
		this.selectedSet.set(set)
		this.value.set([...set])
	}
}
