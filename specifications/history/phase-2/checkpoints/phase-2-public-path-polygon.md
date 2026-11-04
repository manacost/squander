# Phase 2 public path and polygon checkpoint

## Scope

- Promoted `triangulate_polygon`, `flatten_path`, `StrokeGeometry`, and
  `TriangulatedPolygon` through the public core entrypoint.
- Added public type coverage for polygon triangulation and path flattening.
- Added a real Chromium WebGPU fixture that creates and updates public polygon
  and path handles, submits their prepared geometry, and verifies both revisions
  by deterministic pixel readback.

## Code trace

`src/lib/core/index.ts` → `create_polygon` / `create_path` handles →
`triangulate_polygon` / `flatten_path` → `WebGpuRenderer.draw_commands` →
GPU triangle and stroke submission → readback of polygon and path pixels.

## Verification

- `npm run test:unit` — passed, 112 tests.
- `npm run test:type` — passed.
- `npm run check` — passed with zero Svelte diagnostics.
- `npm run test:webgpu -- --grep 'public polygon and path updates'` — passed,
  one real Chromium WebGPU test with deterministic readback.
- `npm run test:webgpu -- --grep 'quadratic and cubic path curves'` — passed,
  one real Chromium WebGPU curve fixture with independent ink-bound and
  endpoint/peak tolerances.
- The fixture uses the trusted local Vite origin and the repository's explicit
  WebGPU browser configuration.

## Evidence boundary

CPU tests cover validation, snapshots, flattening, tessellation, stroke joins,
and ownership. Real WebGPU tests cover filled/outlined concave polygons,
quadratic/cubic curves, prepared strokes, public updates, cached replacement,
and released-handle rejection. Advanced filled curves, holes, fill rules, and
scene automation remain outside Phase 2.

## Go/no-go

**Promote `paths-and-polygons`.** The public preparation, update, ownership,
geometry-reuse, and real-GPU rendering evidence satisfy the Phase 2 contract.
