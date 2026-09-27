import { NgTemplateOutlet } from '@angular/common'
import { Component, input, TemplateRef } from '@angular/core'

@Component({
	selector: 'app-card',
	imports: [NgTemplateOutlet],
	template: `
		<div
			class="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-3 shadow-2xs sm:p-4 md:p-5"
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
	styles: ``,
})
export default class Card {
	public readonly titleTemplate = input<TemplateRef<void>>()
	public readonly subtitleTemplate = input<TemplateRef<void>>()
	public readonly contentTemplate = input<TemplateRef<void>>()
	public readonly footerTemplate = input<TemplateRef<void>>()
}
