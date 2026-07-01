import { signal, type WritableSignal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { advanceTimersByTime, useFakeTimers, useRealTimers } from '@resetshop/util/test-utils'
import { createCountdown, formatCountdown } from './countdown'

describe('formatCountdown', () => {
	it('formats whole seconds as mm:ss', () => {
		expect(formatCountdown(0)).toBe('00:00')
		expect(formatCountdown(9)).toBe('00:09')
		expect(formatCountdown(75)).toBe('01:15')
		expect(formatCountdown(900)).toBe('15:00')
	})
})

describe('createCountdown', () => {
	beforeEach(() => useFakeTimers())
	afterEach(() => useRealTimers())

	const build = (source: WritableSignal<string | null>) => TestBed.runInInjectionContext(() => createCountdown(source))

	it('stays at 0 when the source is null', () => {
		const remaining = build(signal<string | null>(null))
		TestBed.tick()

		expect(remaining()).toBe(0)
	})

	it('counts whole seconds down from a future timestamp and stops at zero', () => {
		const remaining = build(signal<string | null>(new Date(Date.now() + 5000).toISOString()))
		TestBed.tick()
		expect(remaining()).toBe(5)

		advanceTimersByTime(1000)
		expect(remaining()).toBe(4)

		advanceTimersByTime(4000)
		expect(remaining()).toBe(0)
	})

	it('stays at 0 for a timestamp already in the past', () => {
		const remaining = build(signal<string | null>(new Date(Date.now() - 5000).toISOString()))
		TestBed.tick()

		expect(remaining()).toBe(0)
	})

	it('stays at 0 for a malformed timestamp', () => {
		const remaining = build(signal<string | null>('not-a-date'))
		TestBed.tick()

		expect(remaining()).toBe(0)
	})

	it('resets to 0 when the source clears', () => {
		const source = signal<string | null>(new Date(Date.now() + 5000).toISOString())
		const remaining = build(source)
		TestBed.tick()
		expect(remaining()).toBe(5)

		source.set(null)
		TestBed.tick()

		expect(remaining()).toBe(0)
	})
})
