import { afterAll, afterEach, vi } from 'vitest'

/**
 * Mock function interface - provides call tracking and return value control.
 * Wraps vi.fn() internally while exposing a framework-agnostic API.
 */
export interface MockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> {
	(...args: TArgs): TReturn
	/** All recorded calls to this mock function */
	readonly calls: readonly TArgs[]
	/** Set a resolved promise as the return value */
	mockResolvedValue: (value: Awaited<TReturn>) => MockFn<TArgs, TReturn>
	/** Set a resolved promise as the return value for the next call only */
	mockResolvedValueOnce: (value: Awaited<TReturn>) => MockFn<TArgs, TReturn>
	/** Set a rejected promise as the return value */
	mockRejectedValue: (error: unknown) => MockFn<TArgs, TReturn>
	/** Set a direct return value */
	mockReturnValue: (value: TReturn) => MockFn<TArgs, TReturn>
	/** Set a custom implementation function */
	mockImplementation: (impl: (...args: TArgs) => TReturn) => MockFn<TArgs, TReturn>
	/** Set a rejected promise as the return value for the next call only */
	mockRejectedValueOnce: (error: unknown) => MockFn<TArgs, TReturn>
	/** Set a custom implementation function for the next call only */
	mockImplementationOnce: (impl: (...args: TArgs) => TReturn) => MockFn<TArgs, TReturn>
	/** Set a direct return value for the next call only */
	mockReturnValueOnce: (value: TReturn) => MockFn<TArgs, TReturn>
	/** Clear all recorded calls */
	mockClear: () => void
}

/** The single capability the mock registry exercises — see `mockRegistry` for why it is narrowed. */
type ClearableMock = Pick<MockFn, 'mockClear'>

/**
 * Registry of all created mock functions for bulk operations.
 *
 * Typed as `ClearableMock` rather than `MockFn` because clearing is the only capability the
 * registry exercises. A `MockFn<TArgs, TReturn>` is not assignable to the default
 * `MockFn<unknown[], unknown>` under `strictFunctionTypes` — its call signature and setters take
 * the type parameters in contravariant position — so storing the full interface would force an
 * assertion at every registration. Narrowing to the one member used keeps `fn()` assertion-free.
 *
 * Module-scoped — Vitest runs each test file in its own worker, so
 * the registry is isolated per file. An afterAll hook registered at
 * module load time automatically clears the registry when the suite
 * completes, preventing memory leaks without manual cleanup.
 */
const mockRegistry: Set<ClearableMock> = new Set()

afterAll(() => {
	resetAllMocks()
})

/**
 * Create a mock function that tracks calls and supports return value configuration.
 * Delegates to vi.fn() internally for reliable behavior.
 *
 * @example
 * ```typescript
 * const mockGetRole = fn<[number], Promise<RoleData | null>>();
 * mockGetRole.mockResolvedValue(testRole);
 *
 * // After test
 * expect(mockGetRole.calls).toEqual([[1]]);
 * ```
 */
export function fn<TArgs extends unknown[] = unknown[], TReturn = unknown>(): MockFn<TArgs, TReturn> {
	const viFn = vi.fn<(...args: TArgs) => TReturn>()

	// Use a regular function to preserve `this` context when called as a method
	const mockFn = function (this: unknown, ...args: TArgs): TReturn {
		return viFn.apply(this, args)
	} as MockFn<TArgs, TReturn>

	// Expose calls via getter that delegates to vi.fn()'s internal tracking
	Object.defineProperty(mockFn, 'calls', {
		get: () => viFn.mock.calls as readonly TArgs[],
		enumerable: true,
	})

	mockFn.mockResolvedValue = (value: Awaited<TReturn>) => {
		viFn.mockResolvedValue(value as Awaited<TReturn>)
		return mockFn
	}

	mockFn.mockResolvedValueOnce = (value: Awaited<TReturn>) => {
		viFn.mockResolvedValueOnce(value as Awaited<TReturn>)
		return mockFn
	}

	mockFn.mockRejectedValue = (error: unknown) => {
		viFn.mockRejectedValue(error)
		return mockFn
	}

	mockFn.mockReturnValue = (value: TReturn) => {
		viFn.mockReturnValue(value)
		return mockFn
	}

	mockFn.mockImplementation = (impl: (...args: TArgs) => TReturn) => {
		viFn.mockImplementation(impl)
		return mockFn
	}

	mockFn.mockRejectedValueOnce = (error: unknown) => {
		viFn.mockRejectedValueOnce(error)
		return mockFn
	}

	mockFn.mockImplementationOnce = (impl: (...args: TArgs) => TReturn) => {
		viFn.mockImplementationOnce(impl)
		return mockFn
	}

	mockFn.mockReturnValueOnce = (value: TReturn) => {
		viFn.mockReturnValueOnce(value)
		return mockFn
	}

	mockFn.mockClear = () => {
		viFn.mockClear()
	}

	mockRegistry.add(mockFn)
	return mockFn
}

/**
 * Clear all recorded calls from every mock function created with fn()
 * and every spy created with spyOn().
 * Call this in beforeEach to ensure clean state between tests.
 *
 * Only clears call history — configured return values and implementations
 * are retained so mocks don't need to be reconfigured each test.
 */
export function clearAllMocks(): void {
	for (const mock of mockRegistry) {
		mock.mockClear()
	}
	for (const spy of spyRegistry) {
		spy.mockClear()
	}
}

/**
 * Clear all mock call history and remove all mock references from the registry.
 * Call this in afterAll to release mock references after a test suite completes.
 */
export function resetAllMocks(): void {
	for (const mock of mockRegistry) {
		mock.mockClear()
	}
	mockRegistry.clear()
}

/**
 * Registry of active spies for automatic restoration.
 *
 * Each spy is restored via afterEach so tests don't need manual cleanup.
 * The registry is cleared after restoration to prevent double-restoring.
 */
const spyRegistry: Set<ReturnType<typeof vi.spyOn>> = new Set()

afterEach(() => {
	for (const spy of spyRegistry) {
		spy.mockRestore()
	}
	spyRegistry.clear()
})

/**
 * Spy on an object method, replacing it with a no-op by default.
 * Wraps vi.spyOn() internally and auto-restores after each test.
 *
 * Returns a MockFn so callers can assert on `.calls` if needed.
 *
 * @param obj - The object containing the method to spy on
 * @param method - The method name to spy on
 * @returns A MockFn backed by the spy, with call tracking
 *
 * @example
 * ```typescript
 * // Silence only — no assertions needed
 * beforeEach(() => {
 *   spyOn(console, 'error');
 * });
 *
 * // Silence and assert on calls
 * const errorSpy = spyOn(console, 'error');
 * expect(errorSpy.calls).toHaveLength(1);
 * ```
 */
export function spyOn<T extends object>(obj: T, method: string & keyof T): MockFn {
	// REASON: vi.spyOn's generic constraints are too complex to propagate through a wrapper; the runtime call is type-safe via the obj+method pair
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
	const spy = vi.spyOn(obj as any, method as any).mockImplementation((() => {}) as any)
	spyRegistry.add(spy)

	// REASON: the build tsconfig resolves vi.spyOn's return type differently than the spec tsconfig, making spy() not directly callable
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const callSpy = spy as any as (...args: unknown[]) => unknown
	const mockFn = ((...args: unknown[]) => callSpy(...args)) as MockFn
	Object.defineProperty(mockFn, 'calls', {
		get: () => spy.mock.calls,
		enumerable: true,
	})
	mockFn.mockClear = () => spy.mockClear()
	mockFn.mockResolvedValue = (val) => {
		spy.mockResolvedValue(val)
		return mockFn
	}
	mockFn.mockResolvedValueOnce = (val) => {
		spy.mockResolvedValueOnce(val)
		return mockFn
	}
	mockFn.mockRejectedValue = (val) => {
		spy.mockRejectedValue(val)
		return mockFn
	}
	mockFn.mockRejectedValueOnce = (val) => {
		spy.mockRejectedValueOnce(val)
		return mockFn
	}
	mockFn.mockReturnValue = (val) => {
		spy.mockReturnValue(val)
		return mockFn
	}
	mockFn.mockReturnValueOnce = (val) => {
		spy.mockReturnValueOnce(val)
		return mockFn
	}
	mockFn.mockImplementation = (impl) => {
		spy.mockImplementation(impl)
		return mockFn
	}
	mockFn.mockImplementationOnce = (impl) => {
		spy.mockImplementationOnce(impl)
		return mockFn
	}

	return mockFn
}

/**
 * Use fake timers for controlling time-dependent behavior in tests.
 * Wraps vi.useFakeTimers() to centralize Vitest dependencies.
 */
export function useFakeTimers(): void {
	vi.useFakeTimers()
}

/**
 * Advance all fake timers by a specified number of milliseconds.
 * Wraps vi.advanceTimersByTime() to centralize Vitest dependencies.
 */
export function advanceTimersByTime(ms: number): void {
	vi.advanceTimersByTime(ms)
}

/**
 * Advance all fake timers by a specified number of milliseconds asynchronously.
 * Wraps vi.advanceTimersByTimeAsync() to centralize Vitest dependencies.
 */
export async function advanceTimersByTimeAsync(ms: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms)
}

/**
 * Restore real timers after using fake timers.
 * Wraps vi.useRealTimers() to centralize Vitest dependencies.
 */
export function useRealTimers(): void {
	vi.useRealTimers()
}
