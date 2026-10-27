# Phase 2 public factory checkpoint

Status: **Core public factory and type surface verified; final package boundary remains Draft**.

## Pre-slice contract checkpoint

- The existing core entrypoint re-exports the verified path, polygon, geometry
  ownership, color, and game factory surface.
- The runtime `Game` type is exported as `RuntimeGame` from the core entrypoint
  to avoid colliding with the existing Svelte `Game` component export.
- WebGPU renderer exports remain browser-specific and are not re-exported from
  the type-test package entrypoint until the WebGPU declaration boundary is
  deliberately established.

## Implemented slice

- Added `src/lib/core/runtime/index.ts` as the runtime source entrypoint.
- Added explicit core-entrypoint exports for verified factories and types.
- Added root-package type tests for path/polygon opacity, opaque handles, and
  game-owned geometry inference.

## Evidence

- `npm run test:type`: passed.
- `npm run test:unit`: passed, 24 files and 76 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run validate:specs`: passed, 16 capability directories.
- Prettier and `git diff --check`: passed.
- `npm_config_cache=/tmp/squander-npm-cache npm run package`: passed source
  packaging and `publint` using an isolated writable cache. It reported the
  existing SvelteKit dependency warning.
- `npm_config_cache=/tmp/squander-npm-cache npm pack --dry-run --json`: passed
  and included `dist/core/index.js`, `dist/core/runtime/index.js`, and their
  declaration files.
- Self-import verification now passes for `squander/core/runtime` and
  `squander/core`; the explicit export targets prevent Node's unsupported
  directory-import failure.

## Code trace

`type-tests/phase-2-runtime.ts` → `src/lib/index.ts` → `src/lib/core/index.ts`
→ `src/lib/core/runtime/index.ts` → path/polygon/game/geometry factories and
types. The WebGPU-specific module remains intentionally outside this type
entrypoint.

## Known gaps and gate

- Final `squander/core` and package export cleanup, WebGPU type declarations,
  Svelte bridge, and migration boundary remain unimplemented.
- Full lint still includes pre-existing legacy Pixi diagnostics in
  `src/lib/core/index.ts`; the new type and runtime checks are clean.
- Non-fatal package suggestions remain: declare `@sveltejs/kit`, normalize the
  repository URL, and add license metadata. These are migration-boundary work,
  not silently marked as resolved.
- Go/no-go: **continue with final package/export review; do not promote the
  full Phase 2 package.**
