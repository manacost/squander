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
- `npm run package`: source packaging completed, but `publint` could not create
  its temporary npm pack because `/Users/rory/.npm` contains root-owned cache
  files. It also reported the pre-existing SvelteKit peer/dependency warning.

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
- Go/no-go: **continue with final package/export boundary work only after the
  package cache/dependency environment is corrected; do not promote the full
  Phase 2 package.**
