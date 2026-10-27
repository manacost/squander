# Phase 2 dependency review checkpoint

Status: **Dependency metadata reviewed and intentionally deferred to migration; package export validator verified**.

## Pre-slice contract checkpoint

- AD-054 keeps current PixiJS/Svelte dependency metadata until the intentional
  breaking migration boundary.
- Non-fatal package suggestions are recorded rather than changing compatibility
  metadata mid-phase.
- Core package subpaths require a repeatable consumer-facing export check.

## Implemented slice

- Added `verification/validate-package-exports.mjs` and the
  `npm run validate:package` command.
- Verified `squander/core` and `squander/core/runtime` expose the intended
  factory symbols after packaging.
- Left PixiJS, Svelte, repository URL, license metadata, and SvelteKit warning
  unchanged pending the migration decision.

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

- Final migration must decide SvelteKit dependency declaration, repository URL,
  license metadata, PixiJS removal, and Svelte subpath exports together.
- Go/no-go: **continue with capability documentation and final migration review;
  do not promote the full Phase 2 package.**
