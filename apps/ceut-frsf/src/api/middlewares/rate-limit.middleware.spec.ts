/* eslint-disable no-restricted-syntax -- This spec verifies module-eval behavior when PASETO_* are
   absent from process.env, which inherently requires deleting/restoring them directly. The
   no-process-env rule's allowlist (config/test-setup/integration) does not cover middleware specs;
   a direct process.env touch here is the documented exception that the rule message invites. */
import { clearAllMocks, spyOn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * Guards the module-eval env-safety contract: importing this middleware module must NOT read any
 * env proxy at module-evaluation time. The Angular SSR route-extraction / prerender worker imports
 * the server bundle (which pulls in this module) in an env-less context; an eager required-env read
 * there `process.exit(1)`s the worker — breaking `npm run build`. `changePasswordRateLimiter` is
 * built lazily on first request to avoid exactly that.
 *
 * The limiter reads `securityEnv` (no required fields), so an eager read could not FATAL on its own —
 * but the lazy pattern is retained defensively and this spec keeps the contract honest: the module
 * must import cleanly with no env vars set. The dynamic import inside the test is the first load of
 * the module in this isolated worker, reproducing a genuine module-eval with the PASETO vars unset.
 */
describe('rate-limit.middleware module-eval env safety', () => {
	let originalKey: string | undefined
	let originalIssuer: string | undefined

	beforeEach(() => {
		clearAllMocks()
		originalKey = process.env['PASETO_SECRET_KEY']
		originalIssuer = process.env['PASETO_ISSUER']
	})

	afterEach(() => {
		if (originalKey === undefined) delete process.env['PASETO_SECRET_KEY']
		else process.env['PASETO_SECRET_KEY'] = originalKey
		if (originalIssuer === undefined) delete process.env['PASETO_ISSUER']
		else process.env['PASETO_ISSUER'] = originalIssuer
	})

	it('imports without reading any env proxy (no process.exit) when PASETO vars are unset', async () => {
		const exitSpy = spyOn(process, 'exit')
		spyOn(console, 'error') // suppress the FATAL output if the contract is ever violated
		delete process.env['PASETO_SECRET_KEY']
		delete process.env['PASETO_ISSUER']

		// Relies on per-file process isolation (Vitest pool: forks default) so the module cache is
		// fresh per spec file — this dynamic import is the first module-eval of the middleware here.
		const mod = await import('./rate-limit.middleware')

		expect(exitSpy.calls).toHaveLength(0)
		expect(mod.changePasswordRateLimiter).toBeTypeOf('function')
	})
})
