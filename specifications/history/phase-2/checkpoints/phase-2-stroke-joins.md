# Phase 2 stroke join checkpoint

Status: **CPU outer-corner joins verified; policy resolution is recorded separately; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Non-collinear connected segment corners receive an outer join triangle.
- Collinear segments retain the existing flat-capped segment quads without an
  extra join.
- The fixed miter ratio and bevel fallback threshold are recorded in the stroke
  policy checkpoint; rounded joins and camera-scaled width remain deferred.

## Implemented slice

- Added outer-corner join triangles for connected flattened segments.
- Preserved independent disconnected subpaths and existing centered segment
  geometry.
- Kept join behavior CPU-only and internal to preparation.

## Evidence

- `npm run test:unit`: passed, 23 files and 68 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`stroke_geometry.test.ts` → `create_stroke_geometry()` → segment quads →
connected-corner turn test → outer normal pair → bevel join triangle → indexed
frozen geometry. Disconnected subpaths never enter the same join calculation.

## Known gaps and gate

- Stroke ownership, camera scaling, polygon GPU submission, and real GPU
  evidence remain unimplemented. Policy coverage is tracked in the follow-up
  checkpoint, and closed-corner coverage is tracked separately.
- Go/no-go: **continue with closed-corner and stroke-policy verification; do not
  promote `paths-and-polygons`.**
