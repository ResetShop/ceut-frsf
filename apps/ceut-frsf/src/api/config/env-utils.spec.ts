import { spyOn } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dbEnv, resetDbEnv, seedDbEnv } from './db.env'

// Generic fail-fast contract of the createEnvHandler proxy, exercised through a concrete domain
// (db) that has a required field. Reading a required field that is absent from process.env prints a
// FATAL message and process.exit(1)s. This lives here (not in a domain spec) because it tests the
// shared factory behavior, not the db schema.
describe('createEnvHandler proxy — FATAL exit contract', () => {
	beforeEach(() => {
		resetDbEnv()
	})

	afterEach(() => {
		// Restore the handler's test-defaults so other specs in the same worker see them.
		resetDbEnv()
		seedDbEnv()
	})

	it('calls process.exit(1) and logs a FATAL message when a required field is absent from process.env', () => {
		const originalConnString = process.env['PG_CONNECTION_STRING']
		const errorSpy = spyOn(console, 'error')
		const exitSpy = spyOn(process, 'exit')
		exitSpy.mockImplementation((() => {
			throw new Error('process.exit called')
		}) as never)

		try {
			delete process.env['PG_CONNECTION_STRING']
			resetDbEnv()

			expect(() => dbEnv.PG_CONNECTION_STRING).toThrow('process.exit called')
			expect(exitSpy.calls).toContainEqual([1])
			expect(errorSpy.calls.some(([msg]) => String(msg).includes('FATAL'))).toBe(true)
		} finally {
			if (originalConnString !== undefined) {
				process.env['PG_CONNECTION_STRING'] = originalConnString
			}
			// Self-contained cleanup: clear the cache unconditionally so a failed assertion above
			// never leaves the proxy in an uninitialized state for the next test.
			resetDbEnv()
		}
	})
})
