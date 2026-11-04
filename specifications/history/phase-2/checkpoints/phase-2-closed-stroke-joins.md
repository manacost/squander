# Phase 2 closed stroke join checkpoint

Status: **Closed-path wraparound bevel joins verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Closed flattened subpaths connect their final point to the first point.
- Every unique corner, including the wraparound corner, receives the current
  outer bevel join preparation.
- The implementation still does not claim a miter limit, rounded joins,
  configurable caps, or renderer behavior.

## Implemented slice

- Corrected join traversal to use unique points for closed subpaths.
- Added a closed-triangle fixture proving all three corners are prepared.
- Preserved flat-capped segment quads and disconnected-subpath isolation.

## Evidence

- `npm run test:unit`: passed, 23 files and 69 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`stroke_geometry.test.ts` → closed subpath segment loop → unique-point join
indices → wraparound previous/next lookup → outer bevel triangle → indexed
frozen geometry. The closing seam is covered by the same join path as ordinary
corners.

## Known gaps and gate

- Miter-limit policy, cap policy, camera scaling, ownership/release, polygon
  GPU submission, and real GPU evidence remain unimplemented.
- Go/no-go: **continue with explicit stroke-policy decisions and verification;
  do not promote `paths-and-polygons`.**
