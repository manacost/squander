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
- The fixture uses the trusted local Vite origin and the repository's explicit
  WebGPU browser configuration.

## Evidence gaps

The capability remains Draft. Curve endpoint and concavity coverage, geometry
reuse evidence, final update/release contract decisions, and the separate
browser renderer coverage merge remain outstanding. This fixture verifies the
public preparation seam and two successful revisions; it does not replace the
focused validation and ownership suites.

## Go/no-go

**Continue.** The public path/polygon preparation seam is verified. Proceed to
the next remaining Phase 2 capability slice.
