/**
 * Pure decision-logic helpers for `scripts/upstream-pull.mjs`.
 *
 * Kept side-effect-free (no fs/child_process access) so they can be unit-tested
 * without faking `git` — the entry script owns all orchestration and stays a
 * thin wrapper around these decisions.
 */

/**
 * Parses upstream-pull CLI arguments. `--yes` skips the confirmation pause on
 * breaking/migration changelog markers, for scripted/CI runs.
 */
export function parseUpstreamPullArgs(argv) {
	return { skipConfirmation: argv.includes('--yes') }
}

/**
 * Scans the added lines of a `git diff … -- CHANGELOG.md` delta for markers
 * that need a human eye before merging: a `### Removed` heading or a
 * case-insensitive "breaking"/"migration" mention. Only `+` lines count —
 * diff context around old entries must not trigger the pause.
 */
export function detectChangelogWarnings(diffText) {
	const addedText = diffText
		.split('\n')
		.filter((line) => line.startsWith('+') && !line.startsWith('+++'))
		.join('\n')
	const hasRemovedSection = /^\+\s*### Removed\b/m.test(addedText)
	const hasBreakingMention = /breaking/i.test(addedText)
	const hasMigrationMention = /migration/i.test(addedText)
	return {
		hasRemovedSection,
		hasBreakingMention,
		hasMigrationMention,
		hasAny: hasRemovedSection || hasBreakingMention || hasMigrationMention,
	}
}

/**
 * True only when the merge conflict set is exactly the lockfile — the one case
 * `upstream-pull.mjs` auto-resolves (delete + `npm install`), per the
 * docs/forking.md guidance that merged lockfiles are never resolved by hand.
 */
export function isLockfileOnlyConflict(conflictedFiles) {
	return conflictedFiles.length === 1 && conflictedFiles[0] === 'package-lock.json'
}

/**
 * One guidance line per conflicted file, sourced from the resolution
 * conventions in docs/forking.md "Pulling upstream updates". Unknown files fall
 * back to a generic manual-resolution instruction.
 */
export function buildConflictGuidance(conflictedFiles) {
	const guidanceByFile = {
		'package.json':
			'union both sides — accept upstream for starter-owned deps, re-apply fork-added lines alphabetized (docs/forking.md §5)',
		'package-lock.json': 'delete and regenerate — remove the file, then npm install (docs/forking.md §5)',
		'tsconfig.base.json':
			'keep the starter @<scope>/* alias block untouched at the top, re-apply fork aliases below it (docs/forking.md §5)',
		'nx.json': 'accept the upstream change, then re-apply fork additions on top (docs/forking.md §5)',
		'eslint.config.mjs': 'accept the upstream change, then re-apply fork additions on top (docs/forking.md §5)',
	}
	const fallback = 'resolve manually, then git add the file'
	return conflictedFiles.map((file) => `  ${file}: ${guidanceByFile[file] ?? fallback}`).join('\n')
}
