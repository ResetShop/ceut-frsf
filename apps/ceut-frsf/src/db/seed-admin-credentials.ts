/**
 * Resolves the admin credentials the database seed creates, in precedence order:
 *
 *   1. env values  — `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (non-interactive, CI/Docker/prod-safe)
 *   2. interactive — prompt on a TTY for email + password (masked), with re-prompt on invalid input
 *   3. fail-fast   — neither env nor TTY: throw `FAIL_FAST_MESSAGE` so the caller exits non-zero
 *
 * The resolution logic takes its inputs (env values, interactivity, prompt function) by injection so
 * it is unit-testable without a real TTY, `process.env`, or a database. The default prompt
 * (`createDefaultPromptFn`) wraps `node:readline` and is exercised manually / in a real terminal.
 */
import { createInterface, type Interface } from 'node:readline'
import { z } from 'zod'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../contracts/auth/auth.constants'

export interface SeedAdminCredentials {
	email: string
	password: string
	firstName: string
	lastName: string
}

interface SeedAdminEnvInput {
	email: string | undefined
	password: string | undefined
	firstName: string | undefined
	lastName: string | undefined
}

interface ResolveOptions {
	envInput: SeedAdminEnvInput
	isInteractive: boolean
	promptFn: () => Promise<SeedAdminCredentials>
}

export const FAIL_FAST_MESSAGE =
	'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not set and no interactive terminal is available.\n' +
	'Set both env vars before running `npm run drizzle:seed`, or run it in an interactive terminal.'

const DEFAULT_FIRST_NAME = 'Admin'
const DEFAULT_LAST_NAME = 'User'

function isValidEmail(value: string): boolean {
	return z.email().safeParse(value).success
}

function isValidPassword(value: string): boolean {
	return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH
}

/** Throws a descriptive error when the env-supplied credentials are malformed. */
function validateCredentials(email: string, password: string): void {
	if (!isValidEmail(email)) {
		throw new Error(`Invalid SEED_ADMIN_EMAIL: "${email}" is not a valid email address.`)
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(`Invalid SEED_ADMIN_PASSWORD: must be at least ${MIN_PASSWORD_LENGTH} characters.`)
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		throw new Error(`Invalid SEED_ADMIN_PASSWORD: must be at most ${MAX_PASSWORD_LENGTH} characters.`)
	}
}

export async function resolveSeedAdminCredentials(opts: ResolveOptions): Promise<SeedAdminCredentials> {
	const { envInput, isInteractive, promptFn } = opts
	if (envInput.email && envInput.password) {
		validateCredentials(envInput.email, envInput.password)
		return {
			email: envInput.email,
			password: envInput.password,
			firstName: envInput.firstName ?? DEFAULT_FIRST_NAME,
			lastName: envInput.lastName ?? DEFAULT_LAST_NAME,
		}
	}
	if (isInteractive) {
		return promptFn()
	}
	throw new Error(FAIL_FAST_MESSAGE)
}

function ask(rl: Interface, query: string): Promise<string> {
	return new Promise((resolve) => rl.question(query, resolve))
}

/** Prompts without echoing the typed characters (for the password). */
function askMasked(rl: Interface, query: string): Promise<string> {
	// `_writeToOutput` is readline's internal echo hook — the only way to suppress keystroke echo
	// without switching stdin to raw mode. Stable across Node 18–22; re-validate on major Node upgrades.
	const writable = rl as unknown as { _writeToOutput(text: string): void; output: NodeJS.WritableStream }
	const original = writable._writeToOutput.bind(writable)
	let masking = false
	writable._writeToOutput = (text: string) => {
		if (!masking) original(text)
	}
	const answer = new Promise<string>((resolve) =>
		rl.question(query, (value) => {
			writable._writeToOutput = original
			writable.output.write('\n')
			resolve(value)
		}),
	)
	masking = true
	return answer
}

/** Reads one field, re-prompting until `isValid` accepts the trimmed value. */
async function promptValid(
	rl: Interface,
	query: string,
	masked: boolean,
	isValid: (value: string) => boolean,
): Promise<string> {
	for (;;) {
		const value = (masked ? await askMasked(rl, query) : await ask(rl, query)).trim()
		if (isValid(value)) return value
		process.stdout.write('Invalid value, please try again.\n')
	}
}

export function createDefaultPromptFn(): () => Promise<SeedAdminCredentials> {
	return async () => {
		const rl = createInterface({ input: process.stdin, output: process.stdout })
		rl.on('SIGINT', () => {
			rl.close()
			process.exit(1)
		})
		try {
			const email = await promptValid(rl, 'Admin email: ', false, isValidEmail)
			const password = await promptValid(
				rl,
				`Admin password (${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} chars): `,
				true,
				isValidPassword,
			)
			const firstName = (await ask(rl, `Admin first name [${DEFAULT_FIRST_NAME}]: `)).trim() || DEFAULT_FIRST_NAME
			const lastName = (await ask(rl, `Admin last name [${DEFAULT_LAST_NAME}]: `)).trim() || DEFAULT_LAST_NAME
			return { email, password, firstName, lastName }
		} finally {
			rl.close()
		}
	}
}
