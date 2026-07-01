import { clearAllMocks } from '@resetshop/util/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isInteractive } from './runtime'

describe('isInteractive', () => {
	const originalCI = process.env['CI']
	const originalIsTTY = process.stdin.isTTY

	function setIsTTY(value: true | undefined): void {
		Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true, writable: true })
	}

	beforeEach(() => {
		clearAllMocks()
		delete process.env['CI']
	})

	afterEach(() => {
		if (originalCI !== undefined) {
			process.env['CI'] = originalCI
		} else {
			delete process.env['CI']
		}
		setIsTTY(originalIsTTY as true | undefined)
	})

	it('returns true when CI is unset and stdin is a TTY', () => {
		setIsTTY(true)
		expect(isInteractive()).toBe(true)
	})

	it('returns false when CI is set, even if stdin is a TTY', () => {
		process.env['CI'] = 'true'
		setIsTTY(true)
		expect(isInteractive()).toBe(false)
	})

	it('returns false when stdin is not a TTY, even if CI is unset', () => {
		setIsTTY(undefined)
		expect(isInteractive()).toBe(false)
	})

	it('returns false when both CI is set and stdin is not a TTY', () => {
		process.env['CI'] = '1'
		setIsTTY(undefined)
		expect(isInteractive()).toBe(false)
	})
})
