# Phase 2 dependency review checkpoint

Status: **Dependency metadata and package exports verified at the v2 migration boundary**.

## Pre-slice contract checkpoint

- AD-054 records the intentional breaking migration boundary for the replacement
  runtime.
- Package metadata is now explicit for the v2 release; non-fatal suggestions
  are recorded in the package checkpoint when applicable.
- Core package subpaths require a repeatable consumer-facing export check.

## Implemented slice

- Added `verification/validate-package-exports.mjs` and the
  `npm run validate:package` command.
- Verified `squander/core` and `squander/core/runtime` expose the intended
  factory symbols after packaging.
- Removed PixiJS package metadata, retained Svelte as an optional adapter
  dependency, and finalized the repository URL and license metadata.

## Evidence

- `npm_config_cache=/tmp/squander-npm-cache npm run package`: passed with the
  documented non-fatal metadata suggestions.
- `npm run validate:package`: passed for both package subpaths.
- `npm run test:type`: passed.
- `npm run check`: passed with zero diagnostics.
- `npm run validate:specs`: passed, 16 capability directories.
- Prettier and `git diff --check`: passed.

## Code trace

`package.json.exports` → generated package files →
`verification/validate-package-exports.mjs` → `squander/core` and
`squander/core/runtime` → asserted factory symbols.

## Known gaps and gate

- The package boundary is intentionally breaking and complete. Individual
  capability promotion remains governed by the current capability checkpoints.
- Go/no-go: **continue with capability verification; do not promote the full
  Phase 2 package until individual capability gates pass.**
