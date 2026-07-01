import { appEnv } from '../../config/app.env'
import type { EmailContent, EmailLanguage } from './email-builder.utils'
import { escapeHtml, resolveEmailLanguage } from './email-builder.utils'

export interface WelcomeEmailParams {
	firstName: string
	email: string
	password: string
	mustChangePassword: boolean
}

// File-local bilingual email translations
const EMAIL_TRANSLATIONS = Object.freeze({
	en: {
		subject: 'Your new account has been created',
		greeting: 'Hello',
		welcome: 'Welcome! Your account has been created successfully.',
		credentialsHeader: 'Your login credentials:',
		emailLabel: 'Email:',
		passwordLabel: 'Password',
		tempPasswordLabel: 'Temporary Password',
		changeWarning: 'IMPORTANT: Please change your password immediately after your first login for security reasons.',
		footer: 'This is an automated message. Please do not reply to this email.',
		signOff: 'Best regards,',
		team: 'The Team',
	},
	es: {
		subject: 'Tu nueva cuenta ha sido creada',
		greeting: 'Hola',
		welcome: '¡Te damos la bienvenida! Tu cuenta ha sido creada exitosamente.',
		credentialsHeader: 'Tus credenciales de inicio de sesión:',
		emailLabel: 'Correo electrónico:',
		passwordLabel: 'Contraseña',
		tempPasswordLabel: 'Contraseña temporal',
		changeWarning:
			'IMPORTANTE: Por favor, cambia tu contraseña inmediatamente después de tu primer inicio de sesión por razones de seguridad.',
		footer: 'Este es un mensaje automatizado. Por favor, no respondas a este correo electrónico.',
		signOff: 'Saludos cordiales,',
		team: 'El Equipo',
	},
} as const)

/**
 * Build welcome email content for new user accounts
 * Returns subject, HTML, and plain text email content
 *
 * @param params User details and temporary password
 * @param lang - Optional language override. Falls back to APP_LANGUAGE env var, then 'en'.
 * @returns Email content with subject, HTML, and text versions
 */
export function buildWelcomeEmail(params: WelcomeEmailParams, lang?: string): EmailContent {
	const resolvedLang = resolveEmailLanguage(lang ?? appEnv.APP_LANGUAGE)
	const t = EMAIL_TRANSLATIONS[resolvedLang]

	const text = buildTextContent(params, t)
	const html = buildHtmlContent(params, t, resolvedLang)

	return { subject: t.subject, html, text }
}

function buildTextContent(
	{ firstName, email, password, mustChangePassword }: WelcomeEmailParams,
	t: (typeof EMAIL_TRANSLATIONS)[EmailLanguage],
): string {
	const passwordLabel = mustChangePassword ? t.tempPasswordLabel : t.passwordLabel
	const changeWarning = mustChangePassword ? `\n${t.changeWarning}\n` : ''

	return `${t.greeting} ${firstName},

${t.welcome}

${t.credentialsHeader}
${t.emailLabel} ${email}
${passwordLabel}: ${password}
${changeWarning}
${t.footer}

${t.signOff}
${t.team}`
}

function buildHtmlContent(
	{ firstName, email, password, mustChangePassword }: WelcomeEmailParams,
	t: (typeof EMAIL_TRANSLATIONS)[EmailLanguage],
	lang: EmailLanguage,
): string {
	const safeFirstName = escapeHtml(firstName)
	const safeEmail = escapeHtml(email)
	const safePassword = escapeHtml(password)
	const passwordLabel = mustChangePassword ? t.tempPasswordLabel : t.passwordLabel
	const warningHtml = mustChangePassword
		? `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>${t.changeWarning}</strong></p>
    </div>`
		: ''

	return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2c3e50;">${t.greeting} ${safeFirstName},</h1>

    <p>${t.welcome}</p>

    <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2c3e50;">${t.credentialsHeader}</h2>
        <p style="margin: 10px 0;"><strong>${t.emailLabel}</strong> ${safeEmail}</p>
        <p style="margin: 10px 0;"><strong>${passwordLabel}:</strong> <code style="background-color: #e8e8e8; padding: 2px 6px; border-radius: 3px;">${safePassword}</code></p>
    </div>

    ${warningHtml}

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">${t.footer}</p>

    <p>${t.signOff}<br>${t.team}</p>
</body>
</html>`
}
