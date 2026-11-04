# Phase 2 stroke policy checkpoint

Status: **Fixed miter ratio and bevel fallback verified in CPU preparation; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Open strokes use flat caps.
- Connected corners use a miter join when the miter distance divided by half
  stroke width is at most 4.
- Corners exceeding ratio 4 use the fixed outer bevel fallback.
- Rounded or configurable cap/join styles remain deferred.

## Implemented slice

- Resolved AD-031's miter ratio as 4.
- Added miter-point generation for ordinary corners.
- Added deterministic bevel fallback for near-reversal spikes.

## Evidence

- `npm run test:unit`: passed, 23 files and 70 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`stroke_geometry.test.ts` → connected corner → outer normals → miter ratio
calculation → miter point when ratio ≤ 4, otherwise corner bevel point → indexed
frozen geometry.

## Known gaps and gate

- Real GPU stroke rasterization, camera-scaled width, ownership/release, and
  polygon/path public draw integration remain unimplemented.
- Go/no-go: **continue with renderer integration only after its public draw
  contract is specified; do not promote `paths-and-polygons`.**
