/**
 * Returns true only when the process is running interactively — not in CI and
 * connected to a real terminal. Entry-point scripts use it to decide whether to
 * prompt the operator for input or fail fast with a clear error message.
 *
 * Both guards are load-bearing: CI runners set the `CI` variable (and may attach a
 * pseudo-TTY), while piped or non-terminal contexts leave `process.stdin.isTTY`
 * undefined. Requiring both avoids hanging on a prompt that can never be answered.
 *
 * `CI` is an execution-context signal, not application config, so it is read here
 * directly rather than through a domain env schema.
 */
export function isInteractive(): boolean {
	return !process.env['CI'] && Boolean(process.stdin.isTTY)
}
