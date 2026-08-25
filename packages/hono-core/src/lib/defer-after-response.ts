import type { Context } from 'hono'

/**
 * Options for {@link deferAfterResponse}.
 */
export interface DeferAfterResponseOptions {
	/**
	 * Invoked if the deferred work rejects. Required: the work runs *after* the response is sent, so
	 * this callback is the only place a failure can be observed — deferred errors must never be
	 * silently dropped.
	 */
	onError: (error: unknown) => void
}

/**
 * Run background work that must not delay — or be reflected in — the HTTP response, safely on both a
 * long-lived Node server and a freeze-on-flush serverless/edge runtime.
 *
 * The work starts immediately (so it begins before the response is flushed). When the runtime exposes
 * an `ExecutionContext` (as some serverless/edge runtimes do), the task is registered with `waitUntil` so
 * the platform keeps the invocation alive until it settles instead of freezing and discarding the
 * pending promise. On a plain Node server there is no `ExecutionContext`; the event loop keeps
 * running, so the floating task completes on its own.
 *
 * Primary use: decouple response latency from server-side work so an endpoint's timing cannot leak
 * which branch it took — e.g. forgot-password, where doing real work (token + email) only for
 * existing accounts would otherwise expose an account-enumeration timing oracle.
 */
export function deferAfterResponse(
	c: Pick<Context, 'executionCtx'>,
	work: () => Promise<unknown>,
	{ onError }: DeferAfterResponseOptions,
): void {
	const task = Promise.resolve()
		.then(work)
		.catch(onError)
		// Last-resort guard: onError is the real error sink, but if it ever throws this keeps the
		// deferred task from surfacing an unhandled rejection (Node) or a rejected waitUntil (serverless).
		.catch(() => undefined)
	getExecutionCtx(c)?.waitUntil(task)
}

function getExecutionCtx(c: Pick<Context, 'executionCtx'>): Context['executionCtx'] | undefined {
	try {
		// `executionCtx` is a getter that throws when no ExecutionContext is bound (e.g. plain Node).
		return c.executionCtx
	} catch {
		return undefined
	}
}
