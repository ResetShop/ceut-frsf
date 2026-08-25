#!/usr/bin/env node
/**
 * Recurring upstream merge for forks and private mirrors of this starter.
 *
 * Mechanizes the manual steps in docs/forking.md "Pulling upstream updates":
 * fetch the public starter, preview the CHANGELOG delta before anything is
 * merged, run a regular (never squashed) merge, auto-resolve the one conflict
 * class the docs say to never hand-resolve (a lockfile-only conflict), and
 * finish with `npm run ci:verify`. The merge commit is always left unpushed
 * for human review.
 *
 * Usage (from the fork/mirror repo root, on its primary branch):
 *   npm run upstream:pull [-- --yes]
 *
 * `--yes` skips the confirmation pause shown when the CHANGELOG delta contains
 * a `### Removed` heading or a "breaking"/"migration" mention.
 *
 * Exit codes: 0 = merged and ci:verify green (or already up to date),
 * 1 = aborted, stopped on conflicts needing manual resolution, or red CI.
 */
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { UPSTREAM_REPO_URL } from './lib/repo.constants.mjs'
import {
	buildConflictGuidance,
	detectChangelogWarnings,
	isLockfileOnlyConflict,
	parseUpstreamPullArgs,
} from './lib/upstream-pull.helpers.mjs'

function run(command) {
	return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function runInherit(command) {
	execSync(command, { stdio: 'inherit' })
}

function fail(message) {
	console.error(`FATAL: ${message}`)
	process.exit(1)
}

function runPreflightChecks() {
	const status = run('git status --porcelain').trim()
	if (status !== '') {
		fail('Working tree is not clean — commit or stash your changes before pulling upstream')
	}
	try {
		run('git remote get-url upstream')
	} catch {
		// Self-heal for mirrors wired by hand: add the canonical starter remote
		// with its push URL disabled, same shape fork-init produces.
		console.log('No upstream remote found — adding the canonical starter remote')
		runInherit(`git remote add upstream ${UPSTREAM_REPO_URL}`)
		runInherit('git remote set-url --push upstream DISABLED')
	}
}

async function fetchAndPreviewChangelog(skipConfirmation) {
	console.log('--- Fetching upstream ---')
	runInherit('git fetch upstream')
	const mergeBase = run('git merge-base HEAD upstream/main').trim()
	const upstreamHead = run('git rev-parse upstream/main').trim()
	if (mergeBase === upstreamHead) {
		console.log('Already up to date with upstream/main — nothing to merge.')
		process.exit(0)
	}
	const delta = run(`git diff ${mergeBase}..upstream/main -- CHANGELOG.md`)
	if (delta.trim() === '') {
		console.log('No CHANGELOG delta between the merge base and upstream/main.')
		return
	}
	console.log('\n--- CHANGELOG delta since the last merge ---')
	console.log(delta)
	const warnings = detectChangelogWarnings(delta)
	if (warnings.hasAny && !skipConfirmation) {
		await confirmOrAbort(warnings)
	}
}

async function confirmOrAbort(warnings) {
	const markers = [
		warnings.hasRemovedSection ? 'a "### Removed" section' : null,
		warnings.hasBreakingMention ? 'a "breaking" mention' : null,
		warnings.hasMigrationMention ? 'a "migration" mention' : null,
	].filter((marker) => marker !== null)
	console.log(`\nThe CHANGELOG delta contains ${markers.join(', ')} — review it before merging.`)
	const rl = createInterface({ input: process.stdin, output: process.stdout })
	const answer = (await rl.question('Continue with merge? [y/N] ')).trim().toLowerCase()
	rl.close()
	if (answer !== 'y') {
		console.error('Aborted before merge — nothing was changed.')
		process.exit(1)
	}
}

function performMerge() {
	console.log('\n--- Merging upstream/main ---')
	try {
		// A regular merge, never squashed — upstream commit history must stay
		// visible in the fork for future conflict resolution.
		runInherit('git merge upstream/main')
		return []
	} catch {
		const conflictedFiles = run('git diff --name-only --diff-filter=U').trim().split('\n').filter(Boolean)
		if (conflictedFiles.length === 0) {
			fail('git merge failed without leaving conflicts — inspect the repository state manually')
		}
		return conflictedFiles
	}
}

function resolveConflicts(conflictedFiles) {
	if (!isLockfileOnlyConflict(conflictedFiles)) {
		console.error('\nMerge stopped on conflicts that need manual resolution:')
		console.error(buildConflictGuidance(conflictedFiles))
		console.error('\nAfter resolving every file: git add <files> && git commit --no-edit')
		process.exit(1)
	}
	console.log('\n--- Lockfile-only conflict: regenerating package-lock.json ---')
	rmSync('package-lock.json', { force: true })
	runInherit('npm install')
	runInherit('git add package-lock.json')
	runInherit('git commit --no-edit')
}

function runCiVerify() {
	console.log('\n--- Running ci:verify ---')
	try {
		runInherit('npm run ci:verify')
	} catch {
		fail('ci:verify failed — the merge commit is left in place; fix the failures before pushing')
	}
	console.log('\nUpstream merge complete and ci:verify green — review the merge commit and push when ready.')
}

async function main() {
	const { skipConfirmation } = parseUpstreamPullArgs(process.argv.slice(2))
	runPreflightChecks()
	await fetchAndPreviewChangelog(skipConfirmation)
	const conflictedFiles = performMerge()
	if (conflictedFiles.length > 0) {
		resolveConflicts(conflictedFiles)
	}
	runCiVerify()
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
