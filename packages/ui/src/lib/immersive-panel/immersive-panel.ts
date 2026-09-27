import { NgTemplateOutlet } from '@angular/common'
import { Component, input, TemplateRef } from '@angular/core'

@Component({
	selector: 'app-immersive-panel',
	imports: [NgTemplateOutlet],
	host: { class: 'block h-full' },
	template: `
		<div
			class="bg-card text-card-foreground sm:border-border flex h-full flex-col sm:gap-4 sm:rounded-xl sm:border sm:p-4 sm:shadow-2xs md:p-5"
		>
			@if (titleTemplate() || subtitleTemplate()) {
				<div>
					@if (titleTemplate()) {
						<h2 class="text-foreground text-2xl/9 font-bold tracking-tight">
							<ng-container *ngTemplateOutlet="titleTemplate()" />
						</h2>
					}
					@if (subtitleTemplate()) {
						<div class="text-muted-foreground mt-1 text-xs font-medium uppercase">
							<ng-container *ngTemplateOutlet="subtitleTemplate()" />
						</div>
					}
				</div>
			}
			@if (contentTemplate()) {
				<div class="text-muted-foreground mt-2">
					<ng-container *ngTemplateOutlet="contentTemplate()" />
				</div>
			}
			@if (footerTemplate()) {
				<div class="mt-8">
					<ng-container *ngTemplateOutlet="footerTemplate()" />
				</div>
			}
		</div>
	`,
})
export default class ImmersivePanel {
	public readonly titleTemplate = input<TemplateRef<void>>()
	public readonly subtitleTemplate = input<TemplateRef<void>>()
	public readonly contentTemplate = input<TemplateRef<void>>()
	public readonly footerTemplate = input<TemplateRef<void>>()
}
