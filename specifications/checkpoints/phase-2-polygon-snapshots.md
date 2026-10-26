# Phase 2 polygon snapshot checkpoint

Status: **CPU polygon snapshot and validation verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Polygon inputs are ordered `{ x, y }` point arrays with an implicit closing
  edge.
- Creation and explicit `update(points)` snapshot point values and preserve
  caller-owned arrays and point objects.
- Consecutive duplicate points and one repeated closing point are removed from
  the snapshot.
- Nonfinite coordinates, self-intersections, fewer than three distinct points,
  and zero-area polygons are rejected. Invalid updates preserve the prior
  snapshot.
- This slice intentionally does not claim game ownership, release, paths,
  tessellation, or GPU rendering.

## Implemented slice

- Added an opaque polygon handle with immutable point snapshots.
- Added normalization and finite-coordinate, area, and self-intersection
  validation.
- Added focused tests for normalization, caller isolation, valid updates, and
  invalid-update preservation.

## Evidence

- `npm run test:unit`: passed, 19 files and 54 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed, 16 capability directories.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`polygons.test.ts` → `create_polygon(points)` or `polygon.update(points)` →
normalization and geometry validation → frozen point snapshot →
`get_points()` result. Invalid updates throw before replacing the prior snapshot.

## Known gaps and gate

- Reusable path command snapshots, polygon ownership/release, tessellation,
  concave GPU fixtures, fill/outline submission, and package exports remain
  unimplemented.
- Overlapping-edge and nonadjacent-touching-vertex policy remains open as
  recorded in AD-036.
- Go/no-go: **continue with the next path/polygon preparation slice; do not
  promote `paths-and-polygons`.**
