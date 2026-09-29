import { TestBed } from '@angular/core/testing'
import { type MockFn, clearAllMocks, fn } from '@resetshop/util/test-utils'
import { Logger } from '../logger/logger.token'
import { Translation, TRANSLATION_LOADER } from './translation'
import type { TranslationSchema } from './translations.schema'

const stubTranslations: Record<string, TranslationSchema> = {
	en: {
		AUTH: {
			LOGIN: {
				TITLE: 'Sign in',
				EMAIL_LABEL: 'Email',
				PASSWORD_LABEL: 'Password',
				FORGOT_PASSWORD: 'Forgot?',
				SUBMIT: 'Sign in',
			},
			RESET_PASSWORD: {
				TITLE: 'Reset',
				DESCRIPTION: 'Enter email',
				EMAIL_LABEL: 'Email',
				SUBMIT: 'Send',
				BACK_TO_LOGIN: 'Back',
				CONFIRMATION: 'Link sent',
			},
			RESET_PASSWORD_CONFIRM: {
				TITLE: 'Set new',
				DESCRIPTION: 'Choose new',
				NEW_PASSWORD_LABEL: 'New',
				SUBMIT: 'Reset',
				MISSING_TOKEN: 'Invalid link',
			},
			CHANGE_PASSWORD: {
				TITLE: 'Change',
				DESCRIPTION: 'Set new',
				OLD_PASSWORD_LABEL: 'Current',
				NEW_PASSWORD_LABEL: 'New',
				SUBMIT: 'Change',
			},
			ERRORS: {
				INVALID_CREDENTIALS: 'Invalid credentials',
				OLD_PASSWORD_MISMATCH: 'Current password is incorrect',
				RESET_TOKEN_INVALID: 'Invalid or expired link',
				ACCOUNT_LOCKED: 'Locked',
				ACCOUNT_DISABLED: 'Disabled',
				ACCOUNT_DELETED: 'Deleted',
				TOKEN_EXPIRED: 'Expired',
				TOKEN_INVALID: 'Invalid',
				GENERIC: 'Error',
				ACCOUNT_LOCKED_UNTIL: 'Locked for {time}',
				RATE_LIMITED_UNTIL: 'Rate limited for {time}',
			},
		},
		LANDING: {
			PAGE_TITLE: 'Welcome',
			BRAND_NAME: 'Starter',
			HERO_HEADING: 'Starter',
			HERO_SUBHEADING: 'Subheading',
			HERO_CTA: 'Get started',
			LOGIN_BUTTON: 'Sign in',
			SKIP_TO_CONTENT: 'Skip',
			FEATURES: {
				TITLE: 'Features',
				AUTH_TITLE: 'Auth',
				AUTH_DESCRIPTION: 'Auth desc',
				RBAC_TITLE: 'RBAC',
				RBAC_DESCRIPTION: 'RBAC desc',
				SSR_TITLE: 'SSR',
				SSR_DESCRIPTION: 'SSR desc',
			},
		},
		COMMON: {
			LOADING: 'Loading',
			CANCEL: 'Cancel',
			SAVE: 'Save',
			SAVING: 'Saving',
			CREATE: 'Create',
			CREATING: 'Creating',
			EDIT: 'Edit',
			DELETE: 'Delete',
			DISCARD: 'Discard',
			CONFIRM: 'Confirm',
			DISCARD_DIALOG: { TITLE: 'Discard?', MESSAGE: 'Unsaved changes', CONFIRM: 'Discard' },
			LOGOUT: 'Logout',
			STATUS: { ACTIVE: 'Active', DISABLED: 'Disabled', DELETED: 'Deleted' },
		},
		USERS: {
			PAGE: {
				NAV: 'Users',
				TITLE: 'Users',
				DESCRIPTION: 'Manage',
				SEARCH: 'Search',
				CREATE_BUTTON: 'Create',
				RESET_PASSWORD_BUTTON: 'Reset',
				DELETE_DIALOG: { TITLE: 'Delete?', MESSAGE: 'Sure?' },
				RESET_PASSWORD_DIALOG: { TITLE: 'Reset?', MESSAGE: 'Sure?' },
			},
			TABLE: { CAPTION: 'Users', HEADER: { NAME: 'Name', EMAIL: 'Email', STATUS: 'Status', ROLES: 'Roles' } },
			CREATE_DRAWER: {
				TITLE: 'Create',
				FIRST_NAME: 'First',
				LAST_NAME: 'Last',
				EMAIL: 'Email',
				MUST_CHANGE_PASSWORD: 'Must change',
				ROLES_LABEL: 'Roles',
				SUCCESS_TOAST: 'Created',
			},
			DETAIL: {
				TITLE: 'Details',
				BACK: 'Back',
				PROFILE: {
					TITLE: 'Profile',
					FIRST_NAME: 'First',
					LAST_NAME: 'Last',
					EMAIL: 'Email',
				},
				ROLES: {
					TITLE: 'Roles',
					EMPTY: 'None',
				},
				EDIT: {
					BUTTON: 'Edit user',
					DRAWER_TITLE: 'Edit User',
					STATUS_LABEL: 'Status',
					REVIEW: 'Review',
					NONE: 'None',
					SUCCESS_TOAST: 'Updated',
					CONFIRM_DIALOG: { TITLE: 'Confirm', MESSAGE: 'Review', CONFIRM: 'Save', BEFORE: 'Before', AFTER: 'After' },
				},
				ACCOUNT: {
					TITLE: 'Account',
					RESET_PASSWORD: 'Reset',
					DISABLE: 'Disable',
					ENABLE: 'Enable',
					DISABLE_DIALOG: { TITLE: 'Disable', MESSAGE: 'Disable?' },
					ENABLE_DIALOG: { TITLE: 'Enable', MESSAGE: 'Enable?' },
					DISABLE_TOAST: 'Disabled',
					ENABLE_TOAST: 'Enabled',
				},
				DANGER: { TITLE: 'Danger', DESCRIPTION: 'Destructive', DELETE: 'Delete' },
			},
			DELETE_TOAST: 'Deleted',
			RESET_PASSWORD_TOAST: 'Reset sent',
		},
		ROLES: {
			PAGE: {
				NAV: 'Roles',
				TITLE: 'Roles',
				DESCRIPTION: 'Manage',
				SEARCH: 'Search',
				CREATE_BUTTON: 'Create',
				DELETE_DIALOG: { TITLE: 'Delete?', MESSAGE: 'Sure?' },
			},
			TABLE: { CAPTION: 'Roles', HEADER: { NAME: 'Name', CODE: 'Code', DESCRIPTION: 'Desc' } },
			CREATE_DRAWER: {
				TITLE: 'Create',
				NAME: 'Name',
				CODE: 'Code',
				CODE_HINT: 'Hint',
				DESCRIPTION: 'Desc',
				PERMISSIONS: 'Perms',
				SUCCESS_TOAST: 'Created',
			},
			EDIT_DRAWER: {
				TITLE: 'Edit',
				NAME: 'Name',
				CODE: 'Code',
				CODE_HINT: 'Hint',
				DESCRIPTION: 'Desc',
				PERMISSIONS: 'Perms',
				SUCCESS_TOAST: 'Updated',
			},
			DELETE_TOAST: 'Deleted',
		},
		PERMISSIONS: {
			PAGE: { NAV: 'Permissions', TITLE: 'Permissions', DESCRIPTION_INTRO: 'Intro', DESCRIPTION_PATTERN: 'Pattern' },
			TABLE: {
				CAPTION: 'Permissions',
				HEADER: { RESOURCE: 'Resource', ACTION: 'Action', IDENTIFIER: 'Id', DESCRIPTION: 'Desc' },
			},
			DESCRIPTIONS: { 'admin:users:read': 'View user details' },
			ERRORS: { ACCESS_DENIED: 'Denied' },
		},
		SETTINGS: {
			NAV: 'Settings',
			TITLE: 'Settings',
			DESCRIPTION: 'Configure',
			LANGUAGE: { LABEL: 'Language', ENGLISH: 'English', SPANISH: 'Spanish' },
		},
		ACCOUNT: {
			NAV: 'Account',
			TITLE: 'Account',
			DESCRIPTION: 'Details',
			PROFILE: { TITLE: 'Profile', FIRST_NAME: 'First', LAST_NAME: 'Last', EMAIL: 'Email' },
			REVIEW: 'Review',
			SUCCESS_TOAST: 'Updated',
			CONFIRM_DIALOG: { TITLE: 'Confirm', MESSAGE: 'Review', CONFIRM: 'Save', BEFORE: 'Before', AFTER: 'After' },
		},
		HEALTH: {
			NAV: 'Health',
			TITLE: 'Health',
			LOADING: 'Loading',
			STATUS_LABEL: 'Status',
			DATE_TIME_LABEL: 'Date',
			CHECKS_HEADER: 'Checks',
			ERROR_TITLE: 'Error',
			DATABASE: { HEADER: 'Database', STATUS: 'Status', RESPONSE_TIME: 'Response' },
		},
		DASHBOARD: {
			BREADCRUMB: 'Dashboard',
			SECTIONS: { MAINTENANCE: 'Maintenance', ADMIN: 'Admin' },
			HOME: {
				NO_ACCESS_TITLE: 'No access',
				NO_ACCESS_MESSAGE: 'Contact admin',
				DESCRIPTIONS: {
					HEALTH: 'Health',
					USERS: 'Users',
					AUTHORIZATION: 'Auth',
				},
			},
			USERS: {
				NAV: 'Users',
			},
			AUTHORIZATION: {
				NAV: 'Auth',
				TITLE: 'Auth',
				ROLES_CARD: { NAME: 'Roles', DESCRIPTION: 'Manage' },
				PERMISSIONS_CARD: { NAME: 'Perms', DESCRIPTION: 'View' },
			},
		},
		HTTP: { ERRORS: { FORBIDDEN: 'Forbidden' } },
		DATA_TABLE: {
			EMPTY: 'Empty',
			LOADING: 'Loading',
			TOGGLE: { TABLE: 'Table', CARDS: 'Cards', GROUP_LABEL: 'Display mode' },
		},
		ROW_ACTIONS: { TRIGGER_LABEL: 'Actions' },
		PAGINATION: {
			LABEL: 'Pagination',
			ROWS_PER_PAGE: 'Rows',
			GO_TO_PREVIOUS: 'Prev',
			GO_TO_NEXT: 'Next',
			GO_TO_PAGE: 'Page',
			PAGE_OF: 'Page X of Y',
		},
		VALIDATION: {
			REQUIRED: 'Required',
			EMAIL: 'Email',
			MIN_LENGTH: 'Min length',
			MAX_LENGTH: 'Max length',
			MIN: 'Min',
			MAX: 'Max',
			PATTERN: 'Pattern',
		},
	},
	es: {
		AUTH: {
			LOGIN: {
				TITLE: 'Iniciar sesión',
				EMAIL_LABEL: 'Correo',
				PASSWORD_LABEL: 'Contraseña',
				FORGOT_PASSWORD: '¿Olvidó?',
				SUBMIT: 'Entrar',
			},
			RESET_PASSWORD: {
				TITLE: 'Restablecer',
				DESCRIPTION: 'Ingresa email',
				EMAIL_LABEL: 'Correo',
				SUBMIT: 'Enviar',
				BACK_TO_LOGIN: 'Volver',
				CONFIRMATION: 'Enlace enviado',
			},
			RESET_PASSWORD_CONFIRM: {
				TITLE: 'Nueva contraseña',
				DESCRIPTION: 'Elige nueva',
				NEW_PASSWORD_LABEL: 'Nueva',
				SUBMIT: 'Restablecer',
				MISSING_TOKEN: 'Enlace inválido',
			},
			CHANGE_PASSWORD: {
				TITLE: 'Cambiar',
				DESCRIPTION: 'Nueva contraseña',
				OLD_PASSWORD_LABEL: 'Actual',
				NEW_PASSWORD_LABEL: 'Nueva',
				SUBMIT: 'Cambiar',
			},
			ERRORS: {
				INVALID_CREDENTIALS: 'Credenciales inválidas',
				OLD_PASSWORD_MISMATCH: 'Contraseña actual incorrecta',
				RESET_TOKEN_INVALID: 'Enlace inválido o caducado',
				ACCOUNT_LOCKED: 'Bloqueada',
				ACCOUNT_DISABLED: 'Desactivada',
				ACCOUNT_DELETED: 'Eliminada',
				TOKEN_EXPIRED: 'Expirada',
				TOKEN_INVALID: 'Inválida',
				GENERIC: 'Error de inicio de sesión',
				ACCOUNT_LOCKED_UNTIL: 'Bloqueada por {time}',
				RATE_LIMITED_UNTIL: 'Limitada por {time}',
			},
		},
		LANDING: {
			PAGE_TITLE: 'Bienvenido',
			BRAND_NAME: 'Starter',
			HERO_HEADING: 'Starter',
			HERO_SUBHEADING: 'Subtítulo',
			HERO_CTA: 'Comenzar',
			LOGIN_BUTTON: 'Iniciar sesión',
			SKIP_TO_CONTENT: 'Saltar',
			FEATURES: {
				TITLE: 'Características',
				AUTH_TITLE: 'Auth',
				AUTH_DESCRIPTION: 'Auth desc',
				RBAC_TITLE: 'RBAC',
				RBAC_DESCRIPTION: 'RBAC desc',
				SSR_TITLE: 'SSR',
				SSR_DESCRIPTION: 'SSR desc',
			},
		},
		COMMON: {
			LOADING: 'Cargando',
			CANCEL: 'Cancelar',
			SAVE: 'Guardar',
			SAVING: 'Guardando',
			CREATE: 'Crear',
			CREATING: 'Creando',
			EDIT: 'Editar',
			DELETE: 'Eliminar',
			DISCARD: 'Descartar',
			CONFIRM: 'Confirmar',
			DISCARD_DIALOG: { TITLE: '¿Descartar?', MESSAGE: 'Cambios sin guardar', CONFIRM: 'Descartar' },
			LOGOUT: 'Salir',
			STATUS: { ACTIVE: 'Activo', DISABLED: 'Desactivado', DELETED: 'Eliminado' },
		},
		USERS: {
			PAGE: {
				NAV: 'Usuarios',
				TITLE: 'Usuarios',
				DESCRIPTION: 'Gestionar',
				SEARCH: 'Buscar',
				CREATE_BUTTON: 'Crear',
				RESET_PASSWORD_BUTTON: 'Restablecer',
				DELETE_DIALOG: { TITLE: '¿Eliminar?', MESSAGE: '¿Seguro?' },
				RESET_PASSWORD_DIALOG: { TITLE: '¿Restablecer?', MESSAGE: '¿Seguro?' },
			},
			TABLE: { CAPTION: 'Usuarios', HEADER: { NAME: 'Nombre', EMAIL: 'Correo', STATUS: 'Estado', ROLES: 'Roles' } },
			CREATE_DRAWER: {
				TITLE: 'Crear',
				FIRST_NAME: 'Nombre',
				LAST_NAME: 'Apellido',
				EMAIL: 'Correo',
				MUST_CHANGE_PASSWORD: 'Debe cambiar',
				ROLES_LABEL: 'Roles',
				SUCCESS_TOAST: 'Creado',
			},
			DETAIL: {
				TITLE: 'Detalles',
				BACK: 'Volver',
				PROFILE: {
					TITLE: 'Perfil',
					FIRST_NAME: 'Nombre',
					LAST_NAME: 'Apellido',
					EMAIL: 'Correo',
				},
				ROLES: {
					TITLE: 'Roles',
					EMPTY: 'Ninguno',
				},
				EDIT: {
					BUTTON: 'Editar usuario',
					DRAWER_TITLE: 'Editar usuario',
					STATUS_LABEL: 'Estado',
					REVIEW: 'Revisar',
					NONE: 'Ninguno',
					SUCCESS_TOAST: 'Actualizado',
					CONFIRM_DIALOG: {
						TITLE: 'Confirmar',
						MESSAGE: 'Revisar',
						CONFIRM: 'Guardar',
						BEFORE: 'Antes',
						AFTER: 'Después',
					},
				},
				ACCOUNT: {
					TITLE: 'Cuenta',
					RESET_PASSWORD: 'Restablecer',
					DISABLE: 'Deshabilitar',
					ENABLE: 'Habilitar',
					DISABLE_DIALOG: { TITLE: 'Deshabilitar', MESSAGE: '¿Deshabilitar?' },
					ENABLE_DIALOG: { TITLE: 'Habilitar', MESSAGE: '¿Habilitar?' },
					DISABLE_TOAST: 'Deshabilitado',
					ENABLE_TOAST: 'Habilitado',
				},
				DANGER: { TITLE: 'Peligro', DESCRIPTION: 'Destructivo', DELETE: 'Eliminar' },
			},
			DELETE_TOAST: 'Eliminado',
			RESET_PASSWORD_TOAST: 'Restablecimiento enviado',
		},
		ROLES: {
			PAGE: {
				NAV: 'Roles',
				TITLE: 'Roles',
				DESCRIPTION: 'Gestionar',
				SEARCH: 'Buscar',
				CREATE_BUTTON: 'Crear',
				DELETE_DIALOG: { TITLE: '¿Eliminar?', MESSAGE: '¿Seguro?' },
			},
			TABLE: { CAPTION: 'Roles', HEADER: { NAME: 'Nombre', CODE: 'Código', DESCRIPTION: 'Desc' } },
			CREATE_DRAWER: {
				TITLE: 'Crear',
				NAME: 'Nombre',
				CODE: 'Código',
				CODE_HINT: 'Pista',
				DESCRIPTION: 'Desc',
				PERMISSIONS: 'Permisos',
				SUCCESS_TOAST: 'Creado',
			},
			EDIT_DRAWER: {
				TITLE: 'Editar',
				NAME: 'Nombre',
				CODE: 'Código',
				CODE_HINT: 'Pista',
				DESCRIPTION: 'Desc',
				PERMISSIONS: 'Permisos',
				SUCCESS_TOAST: 'Actualizado',
			},
			DELETE_TOAST: 'Eliminado',
		},
		PERMISSIONS: {
			PAGE: { NAV: 'Permisos', TITLE: 'Permisos', DESCRIPTION_INTRO: 'Intro', DESCRIPTION_PATTERN: 'Patrón' },
			TABLE: {
				CAPTION: 'Permisos',
				HEADER: { RESOURCE: 'Recurso', ACTION: 'Acción', IDENTIFIER: 'Id', DESCRIPTION: 'Desc' },
			},
			DESCRIPTIONS: { 'admin:users:read': 'Ver detalles de usuario' },
			ERRORS: { ACCESS_DENIED: 'Denegado' },
		},
		SETTINGS: {
			NAV: 'Ajustes',
			TITLE: 'Ajustes',
			DESCRIPTION: 'Configurar',
			LANGUAGE: { LABEL: 'Idioma', ENGLISH: 'Inglés', SPANISH: 'Español' },
		},
		ACCOUNT: {
			NAV: 'Cuenta',
			TITLE: 'Cuenta',
			DESCRIPTION: 'Datos',
			PROFILE: { TITLE: 'Perfil', FIRST_NAME: 'Nombre', LAST_NAME: 'Apellido', EMAIL: 'Correo' },
			REVIEW: 'Revisar',
			SUCCESS_TOAST: 'Actualizado',
			CONFIRM_DIALOG: { TITLE: 'Confirmar', MESSAGE: 'Revisar', CONFIRM: 'Guardar', BEFORE: 'Antes', AFTER: 'Después' },
		},
		HEALTH: {
			NAV: 'Salud',
			TITLE: 'Salud',
			LOADING: 'Cargando',
			STATUS_LABEL: 'Estado',
			DATE_TIME_LABEL: 'Fecha',
			CHECKS_HEADER: 'Checks',
			ERROR_TITLE: 'Error',
			DATABASE: { HEADER: 'Base de datos', STATUS: 'Estado', RESPONSE_TIME: 'Respuesta' },
		},
		DASHBOARD: {
			BREADCRUMB: 'Panel',
			SECTIONS: { MAINTENANCE: 'Mantenimiento', ADMIN: 'Admin' },
			HOME: {
				NO_ACCESS_TITLE: 'Sin acceso',
				NO_ACCESS_MESSAGE: 'Contacta al admin',
				DESCRIPTIONS: {
					HEALTH: 'Salud',
					USERS: 'Usuarios',
					AUTHORIZATION: 'Auth',
				},
			},
			USERS: {
				NAV: 'Users',
			},
			AUTHORIZATION: {
				NAV: 'Auth',
				TITLE: 'Auth',
				ROLES_CARD: { NAME: 'Roles', DESCRIPTION: 'Gestionar' },
				PERMISSIONS_CARD: { NAME: 'Permisos', DESCRIPTION: 'Ver' },
			},
		},
		HTTP: { ERRORS: { FORBIDDEN: 'Prohibido' } },
		DATA_TABLE: {
			EMPTY: 'Vacío',
			LOADING: 'Cargando',
			TOGGLE: { TABLE: 'Tabla', CARDS: 'Tarjetas', GROUP_LABEL: 'Modo' },
		},
		ROW_ACTIONS: { TRIGGER_LABEL: 'Acciones' },
		PAGINATION: {
			LABEL: 'Paginación',
			ROWS_PER_PAGE: 'Filas',
			GO_TO_PREVIOUS: 'Anterior',
			GO_TO_NEXT: 'Siguiente',
			GO_TO_PAGE: 'Página',
			PAGE_OF: 'Página X de Y',
		},
		VALIDATION: {
			REQUIRED: 'Requerido',
			EMAIL: 'Correo',
			MIN_LENGTH: 'Longitud mín',
			MAX_LENGTH: 'Longitud máx',
			MIN: 'Mín',
			MAX: 'Máx',
			PATTERN: 'Patrón',
		},
	},
}

function stubLoader(lang: string): Promise<TranslationSchema> {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test data is always present for known languages
	return Promise.resolve(stubTranslations[lang]!)
}

describe('Translation Service', () => {
	let service: Translation
	let loggerMock: { warn: MockFn; info: MockFn; error: MockFn; security: MockFn }

	beforeEach(() => {
		clearAllMocks()
		loggerMock = { warn: fn(), info: fn(), error: fn(), security: fn() }
		TestBed.configureTestingModule({
			providers: [
				{ provide: TRANSLATION_LOADER, useValue: stubLoader },
				{ provide: Logger, useValue: loggerMock },
			],
		})
		service = TestBed.inject(Translation)
	})

	describe('Service Creation', () => {
		it('should be created', () => {
			expect(service).toBeTruthy()
		})

		it('should be a singleton (providedIn: root)', () => {
			const service1 = TestBed.inject(Translation)
			const service2 = TestBed.inject(Translation)
			expect(service1).toBe(service2)
		})

		it('should have default language from environment', () => {
			const currentLang = service.getCurrentLanguage()
			expect(['en', 'es']).toContain(currentLang)
		})
	})

	describe('loadDefaultLanguage()', () => {
		it('should load translations for the default language', async () => {
			await service.loadDefaultLanguage()

			// Should not throw when calling instant after loading
			const result = service.instant('AUTH.ERRORS.GENERIC')
			expect(typeof result).toBe('string')
			expect(result).not.toBe('AUTH.ERRORS.GENERIC')
		})
	})

	describe('instant()', () => {
		beforeEach(async () => {
			await service.loadDefaultLanguage()
		})

		it('should return translated string for valid key', () => {
			const result = service.instant('AUTH.ERRORS.INVALID_CREDENTIALS')

			expect(typeof result).toBe('string')
			expect(result.length).toBeGreaterThan(0)
			expect(result).not.toBe('AUTH.ERRORS.INVALID_CREDENTIALS')
		})

		it('should return the key as fallback for non-existent key path', () => {
			// Force a runtime call with an invalid key structure
			const invalidKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]
			const result = service.instant(invalidKey)

			expect(result).toBe('AUTH.NONEXISTENT.KEY')
		})

		it('should navigate nested keys correctly', () => {
			const result = service.instant('AUTH.ERRORS.ACCOUNT_LOCKED')

			expect(typeof result).toBe('string')
			expect(result.length).toBeGreaterThan(0)
		})
	})

	describe('instant() — fallback argument', () => {
		beforeEach(async () => {
			await service.loadDefaultLanguage()
		})

		it('should return the fallback when the key is missing from the loaded schema', () => {
			const missingKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]

			expect(service.instant(missingKey, 'Default English')).toBe('Default English')
		})

		it('should ignore the fallback and return the resolved translation when the key exists', () => {
			const result = service.instant('AUTH.ERRORS.INVALID_CREDENTIALS', 'Default English')

			expect(result).not.toBe('Default English')
			expect(result).not.toBe('AUTH.ERRORS.INVALID_CREDENTIALS')
		})
	})

	describe('instant() — missing-key warnings', () => {
		beforeEach(async () => {
			await service.loadDefaultLanguage()
			loggerMock.warn.mockClear()
		})

		it('should warn via the Logger when a key is missing from the loaded schema', () => {
			const missingKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]
			service.instant(missingKey)

			expect(loggerMock.warn.calls).toEqual([
				['Translation', 'Missing translation for "AUTH.NONEXISTENT.KEY" in language "en"'],
			])
		})

		it('should warn even when a fallback is supplied', () => {
			const missingKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]
			service.instant(missingKey, 'Default English')

			expect(loggerMock.warn.calls).toEqual([
				['Translation', 'Missing translation for "AUTH.NONEXISTENT.KEY" in language "en"'],
			])
		})

		it('should not warn for a resolved key', () => {
			service.instant('AUTH.ERRORS.INVALID_CREDENTIALS')

			expect(loggerMock.warn.calls).toHaveLength(0)
		})

		it('should deduplicate repeated misses for the same key in the same language', () => {
			const missingKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]
			service.instant(missingKey)
			service.instant(missingKey)
			service.instant(missingKey)

			expect(loggerMock.warn.calls).toHaveLength(1)
		})

		it('should warn again when the same missing key is read after switching language', async () => {
			const missingKey = 'AUTH.NONEXISTENT.KEY' as Parameters<typeof service.instant>[0]
			service.instant(missingKey)

			await service.setLanguage('es')
			service.instant(missingKey)

			expect(loggerMock.warn.calls).toHaveLength(2)
			expect(loggerMock.warn.calls[1]).toEqual([
				'Translation',
				'Missing translation for "AUTH.NONEXISTENT.KEY" in language "es"',
			])
		})
	})

	describe('setLanguage()', () => {
		it('should change the current language', async () => {
			await service.setLanguage('en')
			expect(service.getCurrentLanguage()).toBe('en')

			await service.setLanguage('es')
			expect(service.getCurrentLanguage()).toBe('es')
		})

		it('should load translations for the new language', async () => {
			await service.setLanguage('en')
			const enResult = service.instant('AUTH.ERRORS.INVALID_CREDENTIALS')

			await service.setLanguage('es')
			const esResult = service.instant('AUTH.ERRORS.INVALID_CREDENTIALS')

			// Both should return valid translations (not the key itself)
			expect(enResult).not.toBe('AUTH.ERRORS.INVALID_CREDENTIALS')
			expect(esResult).not.toBe('AUTH.ERRORS.INVALID_CREDENTIALS')

			// They should be different (different languages)
			expect(enResult).not.toBe(esResult)
		})
	})

	describe('getCurrentLanguage()', () => {
		it('should return the current language', () => {
			const lang = service.getCurrentLanguage()
			expect(['en', 'es']).toContain(lang)
		})

		it('should reflect language changes', async () => {
			await service.setLanguage('en')
			expect(service.getCurrentLanguage()).toBe('en')

			await service.setLanguage('es')
			expect(service.getCurrentLanguage()).toBe('es')
		})
	})

	describe('Uninitialized service', () => {
		it('should return the raw key when translations are not loaded', () => {
			const uninitService = TestBed.inject(Translation)

			expect(uninitService.instant('AUTH.ERRORS.GENERIC')).toBe('AUTH.ERRORS.GENERIC')
		})

		it('should return the fallback when translations are not loaded and a fallback is supplied', () => {
			const uninitService = TestBed.inject(Translation)

			expect(uninitService.instant('AUTH.ERRORS.GENERIC', 'Default English')).toBe('Default English')
		})
	})

	describe('Translation Caching', () => {
		it('should not reload already loaded translations', async () => {
			await service.setLanguage('en')
			const firstResult = service.instant('AUTH.ERRORS.GENERIC')

			// Call setLanguage again for the same language
			await service.setLanguage('en')
			const secondResult = service.instant('AUTH.ERRORS.GENERIC')

			expect(firstResult).toBe(secondResult)
		})

		it('should cache multiple languages independently', async () => {
			await service.setLanguage('en')
			const enResult = service.instant('AUTH.ERRORS.GENERIC')

			await service.setLanguage('es')
			const esResult = service.instant('AUTH.ERRORS.GENERIC')

			// Switch back to English - should use cached version
			await service.setLanguage('en')
			const enResultCached = service.instant('AUTH.ERRORS.GENERIC')

			expect(enResult).toBe(enResultCached)
			expect(enResult).not.toBe(esResult)
		})
	})
})
