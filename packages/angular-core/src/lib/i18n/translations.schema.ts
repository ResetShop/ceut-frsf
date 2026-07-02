/**
 * Schema defining the structure of all translation files.
 * All language files (en.ts, es.ts, etc.) must satisfy this interface.
 */
export interface TranslationSchema {
	AUTH: {
		LOGIN: {
			TITLE: string
			EMAIL_LABEL: string
			PASSWORD_LABEL: string
			FORGOT_PASSWORD: string
			SUBMIT: string
		}
		CHANGE_PASSWORD: {
			TITLE: string
			DESCRIPTION: string
			OLD_PASSWORD_LABEL: string
			NEW_PASSWORD_LABEL: string
			SUBMIT: string
		}
		RESET_PASSWORD: {
			TITLE: string
			DESCRIPTION: string
			EMAIL_LABEL: string
			SUBMIT: string
			BACK_TO_LOGIN: string
			CONFIRMATION: string
		}
		RESET_PASSWORD_CONFIRM: {
			TITLE: string
			DESCRIPTION: string
			NEW_PASSWORD_LABEL: string
			SUBMIT: string
			MISSING_TOKEN: string
		}
		ERRORS: {
			INVALID_CREDENTIALS: string
			OLD_PASSWORD_MISMATCH: string
			RESET_TOKEN_INVALID: string
			ACCOUNT_LOCKED: string
			ACCOUNT_DISABLED: string
			ACCOUNT_DELETED: string
			TOKEN_EXPIRED: string
			TOKEN_INVALID: string
			GENERIC: string
			ACCOUNT_LOCKED_UNTIL: string
			RATE_LIMITED_UNTIL: string
		}
	}
	LANDING: {
		PAGE_TITLE: string
		BRAND_NAME: string
		HERO_HEADING: string
		HERO_SUBHEADING: string
		HERO_CTA: string
		LOGIN_BUTTON: string
		SKIP_TO_CONTENT: string
		FEATURES: {
			TITLE: string
			AUTH_TITLE: string
			AUTH_DESCRIPTION: string
			RBAC_TITLE: string
			RBAC_DESCRIPTION: string
			SSR_TITLE: string
			SSR_DESCRIPTION: string
		}
		// Optional so fork apps can supply the CEUT portal home copy without
		// forcing the key on apps (e.g. reference-app) that don't render it.
		PORTAL?: {
			EYEBROW: string
			SECTION_HEADING: string
			SEARCH_PLACEHOLDER: string
			EMPTY_STATE: string
			INSTAGRAM_TITLE: string
			FOOTER: {
				TAGLINE: string
				INSTAGRAM_TITLE: string
				DISCORD_TITLE: string
			}
			CARDS: {
				BIBLIOTECA: { TITLE: string; TEXT: string; FOOTER: string }
				DONDE_CURSO: { TITLE: string; TEXT: string }
				HORARIOS: { TITLE: string; TEXT: string }
				CALCULADORA: { TITLE: string; TEXT: string; FOOTER: string }
				BECAS: { TITLE: string; TEXT: string }
				CAFE: { TITLE: string; TEXT: string }
				CORO: { TITLE: string; TEXT: string; FOOTER: string }
				CALENDARIO: { TITLE: string; TEXT: string }
				CAMPUS_VIRTUAL: { TITLE: string; TEXT: string }
				LIBROS_APUNTES: { TITLE: string; TEXT: string; FOOTER: string }
			}
		}
	}
	COMMON: {
		LOADING: string
		CANCEL: string
		SAVE: string
		SAVING: string
		CREATE: string
		CREATING: string
		EDIT: string
		DELETE: string
		DISCARD: string
		CONFIRM: string
		DISCARD_DIALOG: {
			TITLE: string
			MESSAGE: string
			CONFIRM: string
		}
		LOGOUT: string
		STATUS: {
			ACTIVE: string
			DISABLED: string
			DELETED: string
		}
	}
	USERS: {
		PAGE: {
			NAV: string
			TITLE: string
			DESCRIPTION: string
			SEARCH: string
			CREATE_BUTTON: string
			RESET_PASSWORD_BUTTON: string
			DELETE_DIALOG: {
				TITLE: string
				MESSAGE: string
			}
			RESET_PASSWORD_DIALOG: {
				TITLE: string
				MESSAGE: string
			}
		}
		TABLE: {
			CAPTION: string
			HEADER: {
				NAME: string
				EMAIL: string
				STATUS: string
				ROLES: string
			}
		}
		CREATE_DRAWER: {
			TITLE: string
			FIRST_NAME: string
			LAST_NAME: string
			EMAIL: string
			MUST_CHANGE_PASSWORD: string
			ROLES_LABEL: string
			SUCCESS_TOAST: string
		}
		DETAIL: {
			TITLE: string
			BACK: string
			PROFILE: {
				TITLE: string
				FIRST_NAME: string
				LAST_NAME: string
				EMAIL: string
				SAVE: string
				SUCCESS_TOAST: string
			}
			ROLES: {
				TITLE: string
				EMPTY: string
				EDIT_BUTTON: string
				DRAWER_TITLE: string
				ROLES_LABEL: string
				SUCCESS_TOAST: string
			}
			ACCOUNT: {
				TITLE: string
				RESET_PASSWORD: string
				DISABLE: string
				ENABLE: string
				DISABLE_DIALOG: {
					TITLE: string
					MESSAGE: string
				}
				ENABLE_DIALOG: {
					TITLE: string
					MESSAGE: string
				}
				DISABLE_TOAST: string
				ENABLE_TOAST: string
			}
			DANGER: {
				TITLE: string
				DESCRIPTION: string
				DELETE: string
			}
		}
		DELETE_TOAST: string
		RESET_PASSWORD_TOAST: string
	}
	ROLES: {
		PAGE: {
			NAV: string
			TITLE: string
			DESCRIPTION: string
			SEARCH: string
			CREATE_BUTTON: string
			DELETE_DIALOG: {
				TITLE: string
				MESSAGE: string
			}
		}
		TABLE: {
			CAPTION: string
			HEADER: {
				NAME: string
				CODE: string
				DESCRIPTION: string
			}
		}
		CREATE_DRAWER: {
			TITLE: string
			NAME: string
			CODE: string
			CODE_HINT: string
			DESCRIPTION: string
			PERMISSIONS: string
			SUCCESS_TOAST: string
		}
		EDIT_DRAWER: {
			TITLE: string
			NAME: string
			CODE: string
			CODE_HINT: string
			DESCRIPTION: string
			PERMISSIONS: string
			SUCCESS_TOAST: string
		}
		DELETE_TOAST: string
	}
	PERMISSIONS: {
		PAGE: {
			NAV: string
			TITLE: string
			DESCRIPTION_INTRO: string
			DESCRIPTION_PATTERN: string
		}
		TABLE: {
			CAPTION: string
			HEADER: {
				RESOURCE: string
				ACTION: string
				IDENTIFIER: string
				DESCRIPTION: string
			}
		}
		ERRORS: {
			ACCESS_DENIED: string
		}
	}
	SETTINGS: {
		NAV: string
		TITLE: string
		DESCRIPTION: string
		LANGUAGE: {
			LABEL: string
			ENGLISH: string
			SPANISH: string
		}
	}
	HEALTH: {
		NAV: string
		TITLE: string
		LOADING: string
		STATUS_LABEL: string
		DATE_TIME_LABEL: string
		CHECKS_HEADER: string
		ERROR_TITLE: string
		DATABASE: {
			HEADER: string
			STATUS: string
			RESPONSE_TIME: string
		}
	}
	DASHBOARD: {
		BREADCRUMB: string
		SECTIONS: {
			SETTINGS: string
			ADMIN: string
		}
		HOME: {
			NO_ACCESS_TITLE: string
			NO_ACCESS_MESSAGE: string
			DESCRIPTIONS: {
				SETTINGS: string
				HEALTH: string
				USERS: string
				AUTHORIZATION: string
			}
		}
		AUTHORIZATION: {
			NAV: string
			TITLE: string
			ROLES_CARD: {
				NAME: string
				DESCRIPTION: string
			}
			PERMISSIONS_CARD: {
				NAME: string
				DESCRIPTION: string
			}
		}
	}
	HTTP: {
		ERRORS: {
			FORBIDDEN: string
		}
	}
	DATA_TABLE: {
		EMPTY: string
		LOADING: string
		TOGGLE: {
			TABLE: string
			CARDS: string
			GROUP_LABEL: string
		}
	}
	ROW_ACTIONS: {
		TRIGGER_LABEL: string
	}
	PAGINATION: {
		LABEL: string
		ROWS_PER_PAGE: string
		GO_TO_PREVIOUS: string
		GO_TO_NEXT: string
		GO_TO_PAGE: string
		PAGE_OF: string
	}
	VALIDATION: {
		REQUIRED: string
		EMAIL: string
		MIN_LENGTH: string
		MAX_LENGTH: string
		MIN: string
		MAX: string
		PATTERN: string
	}
}

/**
 * Recursively extracts all dot-notation paths from a nested object type.
 * Converts { AUTH: { ERRORS: { ACCOUNT_LOCKED: string } } }
 * Into: 'AUTH.ERRORS.ACCOUNT_LOCKED'
 */
type PathsToStringProps<T, Prefix extends string = ''> = T extends string
	? Prefix
	: {
			[K in keyof T]: K extends string
				? PathsToStringProps<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K}`>
				: never
		}[keyof T]

/**
 * Type-safe translation keys derived from TranslationSchema.
 * Enforces that only valid keys can be passed to the instant() method.
 *
 * @example
 * type Result = TranslationKey;
 * // Result = 'AUTH.ERRORS.INVALID_CREDENTIALS' | 'AUTH.ERRORS.ACCOUNT_LOCKED' | ...
 */
export type TranslationKey = PathsToStringProps<TranslationSchema>
