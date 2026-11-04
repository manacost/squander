# Phase 2 polygon triangulation checkpoint

Status: **CPU triangulation for validated simple polygons verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Triangulation accepts the validated point-array polygon contract and returns
  immutable vertices plus indexed triangles.
- Clockwise and counterclockwise inputs produce equivalent covered area.
- Concave polygons are supported without filling their notch.
- Caller arrays and point objects are not mutated.
- The triangulation algorithm is an internal preparation choice, not a public
  API commitment; no GPU behavior is claimed by this slice.

## Implemented slice

- Added CPU ear-clipping preparation for normalized simple polygons.
- Added winding normalization while retaining original vertex references in the
  returned immutable vertex snapshot.
- Reused polygon validation so malformed input fails before preparation.

## Evidence

- `npm run test:unit`: passed, 21 files and 61 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed, 16 capability directories.
- Focused ESLint, Prettier, and `git diff --check`: passed.
- Focused test caught and then verified the clockwise winding correction.

## Code trace

`triangulation.test.ts` → `triangulate_polygon(input)` → shared polygon
normalization/validation → winding normalization → ear selection and indexed
triangle emission → frozen vertices and indices. Invalid geometry is rejected
before triangle preparation.

## Known gaps and gate

- Path flattening, stroke geometry, polygon fill/outline GPU submission,
  resource ownership/release, and real GPU coverage remain unimplemented.
- No exact tessellation tolerance or renderer-facing geometry contract has been
  promoted.
- Go/no-go: **continue with path flattening/stroke preparation; do not promote
  `paths-and-polygons`.**
