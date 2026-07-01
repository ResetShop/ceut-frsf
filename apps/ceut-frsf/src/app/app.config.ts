import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'
import {
	ApplicationConfig,
	inject,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners,
	provideZonelessChangeDetection,
} from '@angular/core'
import { provideSignalFormsConfig } from '@angular/forms/signals'
import { provideClientHydration, withEventReplay } from '@angular/platform-browser'
import {
	provideRouter,
	TitleStrategy,
	withExperimentalAutoCleanupInjectors,
	withViewTransitions,
} from '@angular/router'
import { projectConfig } from '@configs/project.config'
import { Analytics } from '@providers/analytics/analytics'
import { provideAuth, withNavigationPermissionCheck } from '@providers/auth/auth.provider'
import { provideProjectConfig } from '@providers/project/project.provider'
import type { Language } from '@resetshop/angular-core/i18n/translation'
import { initializeTranslation } from '@resetshop/angular-core/i18n/translation.initializer'
import { provideTranslation } from '@resetshop/angular-core/i18n/translation.provider'
import { NavigationTitleStrategy } from '@resetshop/angular-core/navigation/navigation-title.strategy'
import { provideTheme } from '@resetshop/angular-core/theme/theme'
import { UIStore } from '@store/ui/ui.store'
import { appRoutes } from './app.routes'
import { environment } from './environments/environment'
import { authInterceptor } from './interceptors/auth.interceptor'
import { forbiddenInterceptor } from './interceptors/forbidden.interceptor'
import { tokenRefreshInterceptor } from './interceptors/token-refresh.interceptor'

function initializeAnalytics() {
	return async () => {
		if (environment.environment !== 'production') {
			return
		}

		const analytics = inject(Analytics)
		await analytics.init()
	}
}

export const appConfig: ApplicationConfig = {
	providers: [
		provideClientHydration(withEventReplay()),
		provideBrowserGlobalErrorListeners(),
		provideZonelessChangeDetection(),
		provideRouter(appRoutes, withViewTransitions(), withExperimentalAutoCleanupInjectors()),
		provideHttpClient(withFetch(), withInterceptors([authInterceptor, tokenRefreshInterceptor, forbiddenInterceptor])),

		// Initializers
		provideAppInitializer(initializeAnalytics()),
		provideAppInitializer(initializeTranslation()),

		// Signal forms
		...provideSignalFormsConfig({}),

		// Translation — lazy-loads locale files, reads default language from environment
		provideTranslation({
			defaultLanguage: (environment.defaultLanguage as Language) ?? 'en',
			loader: async (lang: Language) => {
				switch (lang) {
					case 'en':
						return (await import('./providers/i18n/translations/en')).default
					case 'es':
						return (await import('./providers/i18n/translations/es')).default
					default:
						throw new Error(`Unsupported language: ${lang}`)
				}
			},
		}),

		// Custom providers
		Analytics,
		UIStore,
		provideTheme(),
		provideProjectConfig(projectConfig),
		{ provide: TitleStrategy, useClass: NavigationTitleStrategy },

		// API providers — `withNavigationPermissionCheck()` opts the app into routing
		// `NAVIGATION_PERMISSION_CHECK` through `AuthStore.currentUser`.
		provideAuth(withNavigationPermissionCheck()),
	],
}
