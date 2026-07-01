/**
 * Type declaration for `?raw` imports of wordlist text files.
 *
 * Vite (dev server) and esbuild (Angular's prod build via `@angular/build:application`)
 * both honour the `?raw` query to embed the file content as a string at build time.
 * This removes the need for a runtime `fs.readFile` and a corresponding asset-copy step.
 */
declare module '*.txt?raw' {
	const content: string
	export default content
}
