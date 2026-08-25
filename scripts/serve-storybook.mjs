#!/usr/bin/env node
/**
 * Static file server for the built Storybook bundle (`dist/storybook/app`).
 *
 * Storybook's `build-storybook` target emits a fully static site. Railway (and
 * similar platforms) deploy services with a start command rather than offering
 * zero-config static hosting, so the bundle needs a small server bound to the
 * platform-injected `$PORT` on `0.0.0.0`. This uses only Node built-ins —
 * nothing from `node_modules` — so it is immune to production dependency
 * pruning on the deploy image.
 *
 * Usage: `npm run storybook:serve` (after `npm run storybook:build`).
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'

import { getContentType, resolveRequestedFilePath } from './lib/serve-storybook.helpers.mjs'

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const STORYBOOK_DIR = join(REPO_ROOT, 'dist', 'storybook', 'app')
// A string PORT of "0" is a valid request for an OS-assigned port, so only fall
// back to the default when PORT is genuinely absent — `Number(x) || 4400` would
// wrongly rewrite an explicit 0 to 4400.
const PORT = process.env.PORT ? Number(process.env.PORT) : 4400
const HOST = '0.0.0.0'

function sendFile(res, filePath) {
	const stream = createReadStream(filePath)
	// `.pipe()` does not forward source errors, so a read failure after the
	// existsSync/statSync check (a TOCTOU race, a permissions change) would
	// otherwise throw an unhandled error and crash the process.
	stream.on('error', (error) => {
		console.error(`Failed to stream ${filePath}:`, error)
		if (res.headersSent) {
			res.destroy(error)
		} else {
			res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
			res.end('Internal server error')
		}
	})
	stream.on('open', () => {
		res.writeHead(200, { 'Content-Type': getContentType(filePath) })
		stream.pipe(res)
	})
}

const server = createServer((req, res) => {
	const resolved = resolveRequestedFilePath(STORYBOOK_DIR, req.url ?? '/')
	if (resolved && existsSync(resolved) && statSync(resolved).isFile()) {
		sendFile(res, resolved)
		return
	}

	// A path that resolves to no real file (a genuine missing asset, or a
	// rejected traversal) gets a real 404 — the entry document is only served
	// for the root path, resolved in `resolveRequestedFilePath`.
	res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
	res.end('Not found')
})

server.listen(PORT, HOST, () => {
	console.log(`Serving Storybook from ${STORYBOOK_DIR} at http://${HOST}:${PORT}`)
})
