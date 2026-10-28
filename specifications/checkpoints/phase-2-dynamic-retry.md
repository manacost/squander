# Phase 2 malformed dynamic input and retry checkpoint

## Scope

- Added unit coverage proving a failed dynamic texture upload does not poison a
  later explicit retry.
- Added real Chromium coverage for malformed PNG data returning
  `ImageDecodeError`, leaving the running game in the `running` state, and
  successfully uploading a valid image afterward.
- Retained ownership assertions for the successful retry and existing late-load
  cleanup behavior.

## Code trace

`game.assets.load_texture(malformed Blob)` → `decode_image_source` → typed
`ImageDecodeError` → game loop remains active → explicit
`game.assets.load_texture(valid Blob)` → owned texture handle → deterministic
GPU readback → release.

## Verification

- `npm run test:unit` — passed, 26 files and 112 tests.
- `npm run test:type` — passed.
- `npm run check` — passed with zero Svelte diagnostics.
- `npm run validate:specs` — passed for 16 capability directories.
- `npm run test:webgpu -- --grep 'malformed input|dynamic-assets'` — passed, 4 real Chromium WebGPU tests.
- `npm run test:coverage:runtime` — passed, with `asset_loading.ts` at 94.38% statements, 91.42% branches, 100% functions, and 94.11% lines.

## Known coverage gaps

The repository-wide `npm run check:coverage` still fails on pre-existing color,
path, triangulation, viewport, and unmerged WebGPU renderer coverage. This slice
does not alter those unrelated gaps.

## Go/no-go

**Continue.** Malformed-input and explicit-retry behavior is evidenced at unit and
real-GPU levels. `dynamic-assets` remains Draft until the complete capability,
documentation, and coverage requirements are satisfied.
