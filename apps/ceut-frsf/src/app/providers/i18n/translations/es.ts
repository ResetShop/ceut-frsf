import type { TranslationSchema } from '@resetshop/angular-core/i18n/translations.schema'

const es: TranslationSchema = {
	AUTH: {
		LOGIN: {
			TITLE: 'Ingresar al sistema',
			EMAIL_LABEL: 'Dirección de email',
			PASSWORD_LABEL: 'Contraseña',
			FORGOT_PASSWORD: '¿Olvidaste tu contraseña?',
			SUBMIT: 'Iniciar sesión',
		},
		CHANGE_PASSWORD: {
			TITLE: 'Cambiar tu contraseña',
			DESCRIPTION: 'Por tu seguridad, establece una nueva contraseña antes de continuar.',
			OLD_PASSWORD_LABEL: 'Contraseña actual',
			NEW_PASSWORD_LABEL: 'Nueva contraseña',
			SUBMIT: 'Cambiar contraseña',
		},
		RESET_PASSWORD: {
			TITLE: 'Restablecer contraseña',
			DESCRIPTION: 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.',
			EMAIL_LABEL: 'Dirección de email',
			SUBMIT: 'Enviar enlace de restablecimiento',
			BACK_TO_LOGIN: 'Volver al inicio de sesión',
			CONFIRMATION:
				'Si existe una cuenta para ese email, se ha enviado un enlace de restablecimiento. Revisa tu bandeja de entrada.',
		},
		RESET_PASSWORD_CONFIRM: {
			TITLE: 'Establece una nueva contraseña',
			DESCRIPTION: 'Elige una nueva contraseña para tu cuenta.',
			NEW_PASSWORD_LABEL: 'Nueva contraseña',
			SUBMIT: 'Restablecer contraseña',
			MISSING_TOKEN: 'Este enlace de restablecimiento es inválido o está incompleto. Por favor, solicita uno nuevo.',
		},
		ERRORS: {
			INVALID_CREDENTIALS: 'Email o contraseña incorrectos',
			OLD_PASSWORD_MISMATCH: 'Tu contraseña actual es incorrecta',
			RESET_TOKEN_INVALID: 'Este enlace de restablecimiento es inválido o ha caducado. Por favor, solicita uno nuevo.',
			ACCOUNT_LOCKED:
				'Tu cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos. Por favor, intenta de nuevo más tarde.',
			ACCOUNT_DISABLED: 'Tu cuenta ha sido deshabilitada. Por favor, contacta con soporte.',
			ACCOUNT_DELETED: 'Esta cuenta ya no existe.',
			TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
			TOKEN_INVALID: 'Sesión inválida. Por favor, inicia sesión de nuevo.',
			GENERIC: 'Error al iniciar sesión. Por favor, intenta de nuevo.',
			ACCOUNT_LOCKED_UNTIL: 'Demasiados intentos fallidos — intenta de nuevo en {time}',
			RATE_LIMITED_UNTIL: 'Demasiadas solicitudes — intenta de nuevo en {time}',
		},
	},
	LANDING: {
		PAGE_TITLE: 'Bienvenido',
		BRAND_NAME: 'Angular Nx Starter',
		HERO_HEADING: 'Starter SSR de Angular + Nx',
		HERO_SUBHEADING:
			'Un starter listo para producción con autenticación, control de acceso basado en roles y renderizado del lado del servidor integrados.',
		HERO_CTA: 'Comenzar',
		LOGIN_BUTTON: 'Iniciar sesión',
		SKIP_TO_CONTENT: 'Saltar al contenido principal',
		FEATURES: {
			TITLE: 'Qué incluye',
			AUTH_TITLE: 'Autenticación',
			AUTH_DESCRIPTION: 'Autenticación segura basada en PASETO con renovación de tokens y gestión de sesiones.',
			RBAC_TITLE: 'Control de acceso basado en roles',
			RBAC_DESCRIPTION: 'Permisos granulares con roles, aplicados tanto a nivel de ruta como de API.',
			SSR_TITLE: 'Renderizado del lado del servidor',
			SSR_DESCRIPTION: 'Angular SSR listo para usar para una primera carga más rápida y un mejor SEO.',
		},
	},
	COMMON: {
		LOADING: 'Cargando...',
		CANCEL: 'Cancelar',
		SAVE: 'Guardar',
		SAVING: 'Guardando...',
		CREATE: 'Crear',
		CREATING: 'Creando...',
		EDIT: 'Editar',
		DELETE: 'Eliminar',
		DISCARD: 'Descartar',
		CONFIRM: 'Confirmar',
		DISCARD_DIALOG: {
			TITLE: 'Descartar cambios',
			MESSAGE: 'Tienes cambios sin guardar. ¿Estás seguro de que deseas descartarlos?',
			CONFIRM: 'Descartar',
		},
		LOGOUT: 'Cerrar sesión',
		STATUS: {
			ACTIVE: 'Activo',
			DISABLED: 'Deshabilitado',
			DELETED: 'Eliminado',
		},
	},
	USERS: {
		PAGE: {
			NAV: 'Usuarios',
			TITLE: 'Usuarios',
			DESCRIPTION: 'Administrar usuarios del sistema, sus roles y estado de cuenta.',
			SEARCH: 'Buscar usuarios...',
			CREATE_BUTTON: 'Crear usuario',
			RESET_PASSWORD_BUTTON: 'Restablecer contraseña',
			DELETE_DIALOG: {
				TITLE: 'Eliminar usuario',
				MESSAGE: "¿Estás seguro de que deseas eliminar al usuario '{name}'? Esta acción no se puede deshacer.",
			},
			RESET_PASSWORD_DIALOG: {
				TITLE: 'Restablecer contraseña',
				MESSAGE:
					"¿Estás seguro de que deseas restablecer la contraseña de '{email}'? Se enviará una nueva contraseña temporal al usuario por correo electrónico, quien deberá cambiarla en su próximo inicio de sesión.",
			},
		},
		TABLE: {
			CAPTION: 'Lista de usuarios',
			HEADER: {
				NAME: 'Nombre',
				EMAIL: 'Correo electrónico',
				STATUS: 'Estado',
				ROLES: 'Roles',
			},
		},
		CREATE_DRAWER: {
			TITLE: 'Crear usuario',
			FIRST_NAME: 'Nombre',
			LAST_NAME: 'Apellido',
			EMAIL: 'Correo electrónico',
			MUST_CHANGE_PASSWORD: 'Debe cambiar la contraseña al primer inicio de sesión',
			ROLES_LABEL: 'Roles',
			SUCCESS_TOAST: 'Usuario creado exitosamente.',
		},
		DETAIL: {
			TITLE: 'Detalles del usuario',
			BACK: 'Volver a Usuarios',
			PROFILE: {
				TITLE: 'Perfil',
				FIRST_NAME: 'Nombre',
				LAST_NAME: 'Apellido',
				EMAIL: 'Correo electrónico',
				SAVE: 'Guardar cambios',
				SUCCESS_TOAST: 'Usuario actualizado exitosamente.',
			},
			ROLES: {
				TITLE: 'Roles',
				EMPTY: 'Sin roles asignados',
				EDIT_BUTTON: 'Editar roles',
				DRAWER_TITLE: 'Editar roles',
				ROLES_LABEL: 'Roles',
				SUCCESS_TOAST: 'Roles actualizados exitosamente.',
			},
			ACCOUNT: {
				TITLE: 'Acciones de la cuenta',
				RESET_PASSWORD: 'Enviar enlace de restablecimiento de contraseña',
				DISABLE: 'Deshabilitar usuario',
				ENABLE: 'Habilitar usuario',
				DISABLE_DIALOG: {
					TITLE: 'Deshabilitar usuario',
					MESSAGE:
						"¿Estás seguro de que deseas deshabilitar a '{name}'? No podrá iniciar sesión hasta que se vuelva a habilitar.",
				},
				ENABLE_DIALOG: {
					TITLE: 'Habilitar usuario',
					MESSAGE: "¿Estás seguro de que deseas habilitar a '{name}'? Recuperará el acceso para iniciar sesión.",
				},
				DISABLE_TOAST: 'Usuario deshabilitado exitosamente.',
				ENABLE_TOAST: 'Usuario habilitado exitosamente.',
			},
			DANGER: {
				TITLE: 'Zona de peligro',
				DESCRIPTION: 'Acciones irreversibles y destructivas.',
				DELETE: 'Eliminar usuario',
			},
		},
		DELETE_TOAST: 'Usuario eliminado exitosamente.',
		RESET_PASSWORD_TOAST: 'Contraseña restablecida. La contraseña temporal se está enviando por correo al usuario.',
	},
	ROLES: {
		PAGE: {
			NAV: 'Roles',
			TITLE: 'Roles',
			DESCRIPTION: 'Administrar roles del sistema y sus permisos asociados.',
			SEARCH: 'Buscar roles...',
			CREATE_BUTTON: 'Crear rol',
			DELETE_DIALOG: {
				TITLE: 'Eliminar rol',
				MESSAGE: "¿Estás seguro de que deseas eliminar el rol '{name}'? Esta acción no se puede deshacer.",
			},
		},
		TABLE: {
			CAPTION: 'Lista de roles',
			HEADER: {
				NAME: 'Nombre',
				CODE: 'Código',
				DESCRIPTION: 'Descripción',
			},
		},
		CREATE_DRAWER: {
			TITLE: 'Crear rol',
			NAME: 'Nombre',
			CODE: 'Código',
			CODE_HINT: 'Generado automáticamente a partir del nombre',
			DESCRIPTION: 'Descripción',
			PERMISSIONS: 'Permisos',
			SUCCESS_TOAST: 'Rol creado exitosamente.',
		},
		EDIT_DRAWER: {
			TITLE: 'Editar rol',
			NAME: 'Nombre',
			CODE: 'Código',
			CODE_HINT: 'El código no se puede cambiar',
			DESCRIPTION: 'Descripción',
			PERMISSIONS: 'Permisos',
			SUCCESS_TOAST: 'Rol actualizado exitosamente.',
		},
		DELETE_TOAST: 'Rol eliminado exitosamente.',
	},
	PERMISSIONS: {
		PAGE: {
			NAV: 'Permisos',
			TITLE: 'Permisos',
			DESCRIPTION_INTRO:
				'Ver todos los permisos del sistema organizados por recurso. Cada identificador sigue el patrón',
			DESCRIPTION_PATTERN: '.',
		},
		TABLE: {
			CAPTION: 'Permisos agrupados por recurso',
			HEADER: {
				RESOURCE: 'Recurso',
				ACTION: 'Acción',
				IDENTIFIER: 'Identificador',
				DESCRIPTION: 'Descripción',
			},
		},
		ERRORS: {
			ACCESS_DENIED: 'No tienes permisos para acceder a esa página.',
		},
	},
	SETTINGS: {
		NAV: 'Ajustes',
		TITLE: 'Ajustes',
		DESCRIPTION: 'Configura las preferencias de tu aplicación.',
		LANGUAGE: {
			LABEL: 'Idioma',
			ENGLISH: 'Inglés',
			SPANISH: 'Español',
		},
	},
	HEALTH: {
		NAV: 'Salud',
		TITLE: 'Verificador de salud de la aplicación',
		LOADING: 'Cargando...',
		STATUS_LABEL: 'Estado:',
		DATE_TIME_LABEL: 'Fecha y hora:',
		CHECKS_HEADER: 'Controles',
		ERROR_TITLE: 'Error:',
		DATABASE: {
			HEADER: 'Base de datos',
			STATUS: 'Estado:',
			RESPONSE_TIME: 'Tiempo de respuesta:',
		},
	},
	DASHBOARD: {
		BREADCRUMB: 'Panel principal',
		SECTIONS: {
			SETTINGS: 'Ajustes y mantenimiento',
			ADMIN: 'Administración',
		},
		HOME: {
			NO_ACCESS_TITLE: 'Sin acceso a módulos',
			NO_ACCESS_MESSAGE:
				'Tu cuenta aún no tiene acceso a ningún módulo. Contacta a tu administrador para solicitar los permisos que necesitas.',
			DESCRIPTIONS: {
				SETTINGS: 'Configura las preferencias de tu aplicación e idioma.',
				HEALTH: 'Monitorea el estado y la salud de los servicios de tu aplicación.',
				USERS: 'Gestiona las cuentas de usuario, sus roles y permisos de acceso.',
				AUTHORIZATION: 'Administra los roles y permisos que controlan el acceso a la plataforma.',
			},
		},
		AUTHORIZATION: {
			NAV: 'Autorización',
			TITLE: 'Autorización',
			ROLES_CARD: {
				NAME: 'Roles',
				DESCRIPTION: 'Define roles y asigna permisos para controlar el acceso a la plataforma.',
			},
			PERMISSIONS_CARD: {
				NAME: 'Permisos',
				DESCRIPTION: 'Consulta y gestiona las definiciones de permisos disponibles en el sistema.',
			},
		},
	},
	HTTP: {
		ERRORS: {
			FORBIDDEN: 'No tienes permiso para realizar esta acción',
		},
	},
	DATA_TABLE: {
		EMPTY: 'No hay datos disponibles',
		LOADING: 'Cargando...',
		TOGGLE: {
			TABLE: 'Vista de tabla',
			CARDS: 'Vista de tarjetas',
			GROUP_LABEL: 'Modo de visualización',
		},
	},
	ROW_ACTIONS: {
		TRIGGER_LABEL: 'Acciones',
	},
	PAGINATION: {
		LABEL: 'Paginación',
		ROWS_PER_PAGE: 'Filas por página',
		GO_TO_PREVIOUS: 'Ir a la página anterior',
		GO_TO_NEXT: 'Ir a la página siguiente',
		GO_TO_PAGE: 'Ir a la página {page}',
		PAGE_OF: 'Página {current} de {total}',
	},
	VALIDATION: {
		REQUIRED: 'Este campo es requerido',
		EMAIL: 'Ingrese un email válido',
		MIN_LENGTH: 'Debe tener al menos {min} caracteres',
		MAX_LENGTH: 'No debe tener más de {max} caracteres',
		MIN: 'Debe ser al menos {min}',
		MAX: 'No debe ser más de {max}',
		PATTERN: 'Formato inválido',
	},
}

export default es
