# Phase 2 owned geometry renderer checkpoint

Status: **Game-owned geometry submission and stale-handle rejection verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- A geometry render command reads a handle through its creating owner before
  preparing GPU work.
- Foreign-owner and released-handle access fails before command submission.
- A successful owned-handle read uses the existing indexed-triangle path and
  preserves camera, viewport, blending, and draw order behavior.

## Implemented slice

- Added an owned-geometry renderer command boundary.
- Connected handle reads to the existing dynamic triangle submission path.
- Added real readback and stale-handle rejection coverage.

## Evidence

- Focused real WebGPU test: owned geometry submission and released-handle
  rejection passed.
- `npm run test:webgpu`: passed, 25 tests.
- `npm run test:unit`: passed, 24 files and 75 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Spec validation, focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → owned `geometry` command →
`handle.read(owner)` → prepared indexed geometry → camera/viewport mapping →
dynamic vertex buffer → render pass/readback. After `handle.release()`, the
same command fails before a GPU submission.

## Known gaps and gate

- GPU buffer lifetime is currently frame-local; persistent geometry resource
  reuse and disposal accounting remain unimplemented.
- Public path/polygon factories, package exports, and broader integration tests
  remain deferred.
- Go/no-go: **continue with persistent geometry preparation/reuse; do not
  promote `paths-and-polygons`.**
