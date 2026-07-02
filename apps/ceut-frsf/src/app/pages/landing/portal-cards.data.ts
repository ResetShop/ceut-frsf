import type { PortalCard } from '@components/portal-card/portal-card.interface'

/**
 * Static CEUT portal card catalog mirroring the Claude Design demo tarjetas.
 *
 * This is a temporary source: the cards epic replaces it with the database
 * feed (public cards view). Until then it lets the home render the definitive
 * design. Accent hexes mirror the brand tokens in `ceut-theme.css` (`--career-*`
 * / `--hands-*`); they are kept as literals here because the accent-contrast
 * resolver needs the raw value in JavaScript, not a CSS variable reference.
 */
export const CEUT_PORTAL_CARDS: readonly PortalCard[] = [
	{
		id: 'biblioteca',
		titleKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.TEXT',
		footerKey: 'LANDING.PORTAL.CARDS.BIBLIOTECA.FOOTER',
		icon: 'biblioteca.png',
		iconWidth: 500,
		iconHeight: 500,
		category: 'Académico',
	},
	{
		id: 'donde-curso',
		titleKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.DONDE_CURSO.TEXT',
		icon: 'donde-curso.png',
		iconWidth: 256,
		iconHeight: 256,
		category: 'Académico',
		accent: '#0099cc',
		glow: true,
	},
	{
		id: 'horarios',
		titleKey: 'LANDING.PORTAL.CARDS.HORARIOS.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.HORARIOS.TEXT',
		icon: 'horarios.png',
		iconWidth: 128,
		iconHeight: 128,
		category: 'Académico',
		accent: '#814cce',
		glow: true,
	},
	{
		id: 'calculadora',
		titleKey: 'LANDING.PORTAL.CARDS.CALCULADORA.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.CALCULADORA.TEXT',
		footerKey: 'LANDING.PORTAL.CARDS.CALCULADORA.FOOTER',
		icon: 'calculator.png',
		iconWidth: 512,
		iconHeight: 512,
		category: 'Herramientas',
	},
	{
		id: 'becas',
		titleKey: 'LANDING.PORTAL.CARDS.BECAS.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.BECAS.TEXT',
		icon: 'becas.png',
		iconWidth: 512,
		iconHeight: 512,
		category: 'Bienestar',
		accent: '#0099cc',
		glow: true,
	},
	{
		id: 'cafe',
		titleKey: 'LANDING.PORTAL.CARDS.CAFE.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.CAFE.TEXT',
		icon: 'cafe.png',
		iconWidth: 159,
		iconHeight: 153,
		category: 'Vida estudiantil',
		accent: '#6e227d',
		glow: true,
	},
	{
		id: 'coro',
		titleKey: 'LANDING.PORTAL.CARDS.CORO.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.CORO.TEXT',
		footerKey: 'LANDING.PORTAL.CARDS.CORO.FOOTER',
		icon: 'coro.png',
		iconWidth: 512,
		iconHeight: 419,
		category: 'Vida estudiantil',
	},
	{
		id: 'calendario',
		titleKey: 'LANDING.PORTAL.CARDS.CALENDARIO.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.CALENDARIO.TEXT',
		icon: 'calendar.png',
		iconWidth: 256,
		iconHeight: 256,
		category: 'Académico',
		accent: '#ee7114',
		glow: true,
	},
	{
		id: 'campus-virtual',
		titleKey: 'LANDING.PORTAL.CARDS.CAMPUS_VIRTUAL.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.CAMPUS_VIRTUAL.TEXT',
		icon: 'cloud.png',
		iconWidth: 512,
		iconHeight: 512,
		category: 'Herramientas',
		accent: '#2bbbad',
		glow: true,
	},
	{
		id: 'libros-apuntes',
		titleKey: 'LANDING.PORTAL.CARDS.LIBROS_APUNTES.TITLE',
		textKey: 'LANDING.PORTAL.CARDS.LIBROS_APUNTES.TEXT',
		footerKey: 'LANDING.PORTAL.CARDS.LIBROS_APUNTES.FOOTER',
		icon: 'book.png',
		iconWidth: 512,
		iconHeight: 512,
		category: 'Académico',
	},
]
