import asyncExitHook from 'async-exit-hook'

// `embedded-postgres` registers its exit hooks when it is first imported, so loading the helper
// module is enough to exercise the hook adjustment — no Postgres cluster is started here. The
// import happens once, in `beforeAll`, so the listener counts bracket that first load.
describe('embedded-pg-test-db exit hooks', () => {
	let beforeExitListenersBeforeImport: number
	let exitListenersBeforeImport: number

	beforeAll(async () => {
		beforeExitListenersBeforeImport = process.listenerCount('beforeExit')
		exitListenersBeforeImport = process.listenerCount('exit')
		await import('./embedded-pg-test-db')
	})

	it('removes the beforeExit hook that would force the process to exit with code 0', () => {
		expect(asyncExitHook.hookedEvents()).not.toContain('beforeExit')
	})

	it('removes the exit hook that would throw while the process exits', () => {
		expect(asyncExitHook.hookedEvents()).not.toContain('exit')
	})

	// Checked on the process rather than through async-exit-hook, so the guard also holds if
	// embedded-postgres resolves a second copy of async-exit-hook or another exit-hook library.
	it('leaves no new beforeExit or exit listener on the process', () => {
		expect(process.listenerCount('beforeExit')).toBe(beforeExitListenersBeforeImport)
		expect(process.listenerCount('exit')).toBe(exitListenersBeforeImport)
	})

	it('keeps the signal hooks that stop the cluster on Ctrl-C', () => {
		expect(asyncExitHook.hookedEvents()).toEqual(expect.arrayContaining(['SIGINT', 'SIGTERM']))
	})
})
