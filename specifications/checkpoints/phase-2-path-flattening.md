# Phase 2 path flattening checkpoint

Status: **CPU path flattening verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Flattening consumes the validated declarative path snapshot and requires an
  explicit finite, positive tolerance.
- Quadratic and cubic curves retain their exact start and end points while
  producing line segments within the requested approximation policy.
- Disconnected subpaths remain separate; closure connects only the current
  subpath and is represented explicitly in the prepared result.
- This slice is preparation-only and does not claim stroke caps, joins, width,
  tessellation tolerance under zoom, ownership, or GPU rendering.

## Implemented slice

- Added recursive CPU flattening for quadratic and cubic Bézier commands.
- Added immutable flattened subpaths with closure markers.
- Reused path command validation and preserved endpoint values.

## Evidence

- `npm run test:unit`: passed, 22 files and 64 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`path_flattening.test.ts` → `flatten_path(input, tolerance)` → path command
snapshot validation → subpath state machine → recursive curve subdivision or
straight segment append → frozen flattened subpaths. Invalid tolerances fail
before preparation.

## Known gaps and gate

- Stroke geometry, caps/joins, camera-scaled width, polygon GPU fill/outline,
  ownership/release, and real GPU evidence remain unimplemented.
- The tolerance is an explicit preparation input; no final renderer tolerance
  has been promoted.
- Go/no-go: **continue with stroke geometry preparation; do not promote
  `paths-and-polygons`.**
