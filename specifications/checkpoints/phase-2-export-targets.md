# Phase 2 explicit export target checkpoint

Status: **Core, core/runtime, and Svelte package subpath imports verified; v2 release metadata is complete**.

## Pre-slice contract checkpoint

- `squander/core` resolves to `dist/core/index.js` with declarations from
  `dist/core/index.d.ts`.
- `squander/core/runtime` resolves to `dist/core/runtime/index.js` with its
  declarations.
- Wildcard exports remain available for deeper module paths; final Svelte and
  WebGPU package boundaries remain separate decisions.

## Implemented slice

- Added explicit `./core` and `./core/runtime` package export targets.
- Preserved the existing wildcard export for deeper generated modules.
- Corrected the observed Node unsupported-directory-import failure.

## Evidence

- `npm_config_cache=/tmp/squander-npm-cache npm run package`: passed.
- `node --input-type=module` self-import: passed for `squander/core/runtime`
  (`create_path`, `create_polygon`) and `squander/core` (`create_path`,
  `create_game`).
- `npm_config_cache=/tmp/squander-npm-cache npm pack --dry-run --json`: passed.
- `npm run validate:specs`: passed, 16 capability directories.
- Prettier and `git diff --check`: passed.

## Code trace

`package.json.exports` → generated `dist/core/index.js` or
`dist/core/runtime/index.js` → Node package self-reference → verified public
factory symbols.

## Known gaps and gate

- `publint` continues to report non-fatal metadata suggestions for the
  SvelteKit declaration, repository URL, and license field.
- Release metadata, Svelte subpath, WebGPU declaration boundary, and Pixi
  removal are verified. Individual capability promotion remains governed by
  the current capability checkpoints.
- Go/no-go: **package boundary is complete; do not promote the full Phase 2
  package until individual capability gates pass.**
