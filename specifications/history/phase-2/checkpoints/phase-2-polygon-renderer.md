# Phase 2 polygon renderer checkpoint

Status: **Concave polygon fill and polygon outline submission verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Polygon fill commands validate and triangulate point-array input before
  rendering.
- Polygon outline commands validate the same point-array input and prepare a
  closed stroke using the fixed stroke policy.
- Fill and outline use the existing indexed-triangle source-over renderer and
  active camera/viewport mapping.
- Public game ownership, release, and final package exports remain deferred.

## Implemented slice

- Added `polygon` fill and `polygon_outline` renderer commands.
- Reused CPU polygon validation, triangulation, and closed stroke preparation.
- Added real readback fixtures for a concave fill notch and an unfilled outline
  interior.

## Evidence

- Focused real WebGPU tests: concave fill and polygon outline passed.
- `npm run test:webgpu`: passed, 24 tests.
- `npm run test:unit`: passed, 23 files and 70 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Spec validation, focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `draw_commands([{ kind: "polygon" |
"polygon_outline", ... }])` → polygon validation → triangulation or closed
stroke preparation → camera/viewport clip mapping → dynamic vertex buffer →
source-over render pass → deterministic readback.

## Known gaps and gate

- Game-owned reusable geometry handles, release/disposal, path public draw
  integration, and package exports remain unimplemented.
- Go/no-go: **continue with reusable geometry ownership and lifecycle wiring;
  do not promote `paths-and-polygons`.**
