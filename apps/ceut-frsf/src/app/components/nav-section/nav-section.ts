import { NgComponentOutlet } from '@angular/common'
import { Component, computed, createEnvironmentInjector, EnvironmentInjector, inject, input } from '@angular/core'
import NavItem from '@components/nav-item/nav-item'
import { provideIcons } from '@ng-icons/core'
import { featherChevronRight } from '@ng-icons/feather-icons'
import { TranslatePipe } from '@resetshop/angular-core/i18n/translate.pipe'
import { NavigationSection } from '@resetshop/angular-core/interfaces/navigation'

@Component({
	selector: 'app-nav-section',
	imports: [NgComponentOutlet, TranslatePipe],
	template: `
		@let sectionName = section().name;
		@if (showTitle() && sectionName) {
			@if (!collapsed()) {
				<div class="flex h-8 items-center px-2 text-xs font-medium text-wrap text-black/70 dark:text-white/70">
					{{ sectionName | translate }}
				</div>
			}
		}
		<ul>
			@for (navItem of navItems(); track navItem.id) {
				<li>
					<ng-container
						*ngComponentOutlet="
							NavItem;
							inputs: { item: navItem.route, collapsed: collapsed() };
							injector: navItem.injector
						"
					/>
				</li>
			}
		</ul>
	`,
	styles: ``,
})
export default class NavSection {
	protected readonly NavItem = NavItem
	public readonly showTitle = input<boolean>(true)
	public readonly section = input.required<NavigationSection>()
	public readonly collapsed = input(false)

	private readonly injector = inject(EnvironmentInjector)

	// We use a custom injector for the nav items to load ng-icons on demand using lazy loading
	// By providing the icon definitions in each *.navigation.ts file we're able to directly load the icons
	// that are rendered on the sidebar
	// We also provide the chevron icon for expandable navigation items
	protected readonly navItems = computed(() =>
		this.section().routes.map((route) => ({
			id: route.id,
			route,
			injector: createEnvironmentInjector(
				route.icon ? [provideIcons({ ...route.icon, featherChevronRight })] : [provideIcons({ featherChevronRight })],
				this.injector,
			),
		})),
	)
}
