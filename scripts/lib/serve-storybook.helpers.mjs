/**
 * Pure decision-logic helpers for `scripts/serve-storybook.mjs`.
 *
 * Kept side-effect-free (no fs/http access) so they can be unit-tested without
 * spinning up a server or touching disk — the entry script owns all
 * orchestration and stays a thin wrapper around these decisions.
 */

import { join, sep } from 'node:path'

/**
 * Maps a file path's extension to a Content-Type, defaulting to
 * `application/octet-stream` for anything unrecognized.
 */
export function getContentType(filePath) {
	const contentTypes = {
		'.html': 'text/html; charset=utf-8',
		'.js': 'text/javascript; charset=utf-8',
		'.mjs': 'text/javascript; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.json': 'application/json; charset=utf-8',
		'.map': 'application/json; charset=utf-8',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.ico': 'image/x-icon',
		'.woff': 'font/woff',
		'.woff2': 'font/woff2',
		'.ttf': 'font/ttf',
		'.webmanifest': 'application/manifest+json',
		'.txt': 'text/plain; charset=utf-8',
	}
	const dot = filePath.lastIndexOf('.')
	const ext = dot === -1 ? '' : filePath.slice(dot).toLowerCase()
	return contentTypes[ext] ?? 'application/octet-stream'
}

/**
 * Resolves a request URL path to an absolute file path inside `rootDir`, or
 * `null` when the request escapes `rootDir` (path traversal) or is malformed.
 *
 * A query string is stripped first — Storybook's static build deep-links via
 * query params (`?path=/story/…`), so the file path itself is never
 * story-specific — and a directory-root request maps to `index.html`.
 */
export function resolveRequestedFilePath(rootDir, requestPath) {
	const withoutQuery = requestPath.split('?')[0]
	let decoded
	try {
		decoded = decodeURIComponent(withoutQuery)
	} catch {
		// Malformed percent-encoding is never a legitimate asset request.
		return null
	}
	const relativePath = decoded === '/' || decoded === '' ? 'index.html' : decoded.replace(/^\/+/, '')
	// `join` already normalizes (collapses `.`/`..` and duplicate separators),
	// so the containment check below runs on the canonical path.
	const resolved = join(rootDir, relativePath)
	const rootWithSep = rootDir.endsWith(sep) ? rootDir : rootDir + sep
	if (resolved !== rootDir && !resolved.startsWith(rootWithSep)) {
		return null
	}
	return resolved
}
