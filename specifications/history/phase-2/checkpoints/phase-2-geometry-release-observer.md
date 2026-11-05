# Phase 2 geometry release observer checkpoint

Status: **Owned geometry release observation and GPU cache cleanup verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Geometry handles expose a one-shot `on_release` observer registration.
- Release and owner disposal notify observers once; repeated release/disposal is
  inert.
- Renderer-owned persistent buffers unregister and destroy on handle release,
  owner disposal, replacement, or renderer disposal.

## Implemented slice

- Added release observer registration and unsubscription to geometry handles.
- Connected persistent renderer cache entries to handle release cleanup.
- Preserved cache replacement and renderer disposal behavior.

## Evidence

- `npm run test:unit`: passed, 24 files and 76 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run test:webgpu`: passed, 26 tests.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`geometry_ownership.test.ts` → `handle.on_release(listener)` → release or owner
disposal → one-shot listener notification. For renderer-owned handles, the
listener removes the snapshot cache entry and destroys its persistent GPU
buffer; renderer disposal unregisters remaining observers and destroys buffers.

## Known gaps and gate

- Public path/polygon factory integration, package exports, and final capability
  promotion evidence remain deferred.
- Go/no-go: **continue with public factory integration; do not promote
  `paths-and-polygons`.**
