/** Shared building blocks for transactional email builders (welcome, password reset, …). */

/** The three rendered representations every email builder returns. */
export interface EmailContent {
	subject: string
	html: string
	text: string
}

/** Languages supported by the bilingual email templates. */
export type EmailLanguage = 'en' | 'es'

/** Resolves an arbitrary language hint to a supported template language, defaulting to English. */
export function resolveEmailLanguage(lang: string | undefined): EmailLanguage {
	return lang === 'es' ? 'es' : 'en'
}

/** Escapes HTML-significant characters in user-provided values before interpolation into an HTML email. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}
