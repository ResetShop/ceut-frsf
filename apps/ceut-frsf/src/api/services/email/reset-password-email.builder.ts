import { appEnv } from '../../config/app.env'
import type { EmailContent, EmailLanguage } from './email-builder.utils'
import { escapeHtml, resolveEmailLanguage } from './email-builder.utils'

export interface ResetPasswordEmailParams {
	firstName: string
	email: string
	password: string
}

// File-local bilingual email translations
const EMAIL_TRANSLATIONS = Object.freeze({
	en: {
		subject: 'Your password has been reset',
		greeting: 'Hello',
		intro: 'Your password has been reset by an administrator.',
		credentialsHeader: 'Your new login credentials:',
		emailLabel: 'Email:',
		passwordLabel: 'Temporary Password',
		changeWarning:
			'IMPORTANT: Please change this temporary password immediately after your next login for security reasons.',
		footer: 'This is an automated message. Please do not reply to this email.',
		signOff: 'Best regards,',
		team: 'The Team',
	},
	es: {
		subject: 'Tu contraseña ha sido restablecida',
		greeting: 'Hola',
		intro: 'Un administrador ha restablecido tu contraseña.',
		credentialsHeader: 'Tus nuevas credenciales de inicio de sesión:',
		emailLabel: 'Correo electrónico:',
		passwordLabel: 'Contraseña temporal',
		changeWarning:
			'IMPORTANTE: Por favor, cambia esta contraseña temporal inmediatamente después de tu próximo inicio de sesión por razones de seguridad.',
		footer: 'Este es un mensaje automatizado. Por favor, no respondas a este correo electrónico.',
		signOff: 'Saludos cordiales,',
		team: 'El Equipo',
	},
} as const)

/**
 * Build password-reset email content for admin-initiated resets.
 * Returns subject, HTML, and plain text email content. The reset always
 * requires the user to change the temporary password on next login.
 *
 * @param params User details and the new temporary password
 * @param lang - Optional language override. Falls back to APP_LANGUAGE env var, then 'en'.
 * @returns Email content with subject, HTML, and text versions
 */
export function buildResetPasswordEmail(params: ResetPasswordEmailParams, lang?: string): EmailContent {
	const resolvedLang = resolveEmailLanguage(lang ?? appEnv.APP_LANGUAGE)
	const t = EMAIL_TRANSLATIONS[resolvedLang]

	const text = buildTextContent(params, t)
	const html = buildHtmlContent(params, t, resolvedLang)

	return { subject: t.subject, html, text }
}

function buildTextContent(
	{ firstName, email, password }: ResetPasswordEmailParams,
	t: (typeof EMAIL_TRANSLATIONS)[EmailLanguage],
): string {
	return `${t.greeting} ${firstName},

${t.intro}

${t.credentialsHeader}
${t.emailLabel} ${email}
${t.passwordLabel}: ${password}

${t.changeWarning}

${t.footer}

${t.signOff}
${t.team}`
}

function buildHtmlContent(
	{ firstName, email, password }: ResetPasswordEmailParams,
	t: (typeof EMAIL_TRANSLATIONS)[EmailLanguage],
	lang: EmailLanguage,
): string {
	const safeFirstName = escapeHtml(firstName)
	const safeEmail = escapeHtml(email)
	const safePassword = escapeHtml(password)

	return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2c3e50;">${t.greeting} ${safeFirstName},</h1>

    <p>${t.intro}</p>

    <div style="background-color: #f4f4f4; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2c3e50;">${t.credentialsHeader}</h2>
        <p style="margin: 10px 0;"><strong>${t.emailLabel}</strong> ${safeEmail}</p>
        <p style="margin: 10px 0;"><strong>${t.passwordLabel}:</strong> <code style="background-color: #e8e8e8; padding: 2px 6px; border-radius: 3px;">${safePassword}</code></p>
    </div>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>${t.changeWarning}</strong></p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">${t.footer}</p>

    <p>${t.signOff}<br>${t.team}</p>
</body>
</html>`
}
