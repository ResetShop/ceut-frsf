import { NgComponentOutlet } from '@angular/common'
import { Component, computed, createEnvironmentInjector, EnvironmentInjector, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { featherChevronRight } from '@ng-icons/feather-icons'

@Component({
	selector: 'app-navigation-card-icon',
	standalone: true,
	imports: [NgIcon],
	template: `
		<ng-icon [name]="name()" size="24" />
	`,
})
export class NavigationCardIcon {
	public readonly name = input.required<string>()
}

@Component({
	selector: 'app-navigation-card',
	imports: [NgComponentOutlet, NgIcon, RouterLink],
	viewProviders: [provideIcons({ featherChevronRight })],
	template: `
		<a
			[routerLink]="route()"
			class="group border-border bg-card hover:border-foreground/20 hover:bg-accent/50 relative flex min-h-32 flex-row rounded-xl border p-5 transition-all duration-150 ease-in-out"
		>
			@if (iconConfig(); as config) {
				<div
					class="text-foreground dark:text-foreground mr-4 flex flex-col transition-transform group-hover:scale-110"
					data-testid="card-icon"
				>
					<ng-container *ngComponentOutlet="IconComponent; inputs: { name: config.name }; injector: config.injector" />
				</div>
			}
			<div class="flex h-full w-full flex-col gap-2">
				<h5 class="text-foreground pr-5 text-sm font-medium">{{ name() }}</h5>
				<p class="text-muted-foreground text-sm">{{ description() }}</p>
			</div>
			<div
				class="text-muted-foreground group-hover:text-foreground absolute top-4 right-4 transition-all duration-200 group-hover:right-3"
				data-testid="chevron-icon"
			>
				<ng-icon name="featherChevronRight" size="16" />
			</div>
		</a>
	`,
})
export default class NavigationCard {
	public readonly route = input.required<string>()
	public readonly name = input.required<string>()
	public readonly description = input.required<string>()
	public readonly icon = input<Record<string, string>>()

	protected readonly IconComponent = NavigationCardIcon

	private readonly parentInjector = inject(EnvironmentInjector)

	protected readonly iconConfig = computed(() => {
		const iconMap = this.icon()
		if (!iconMap) return null
		return {
			name: Object.keys(iconMap)[0],
			injector: createEnvironmentInjector([provideIcons(iconMap)], this.parentInjector),
		}
	})
}
