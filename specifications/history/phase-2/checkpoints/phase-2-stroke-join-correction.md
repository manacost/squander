# Phase 2 stroke-join correction checkpoint

## Scope

- Corrected clockwise outer-join selection for the positive-Y-down coordinate
  system.
- Added independent CPU expectations for the miter join and bevel fallback.
- Added a real WebGPU raster fixture with an observable outer-corner pixel.

## Code trace

`draw_commands({ kind: "stroke" })` → `create_stroke_geometry` → turn direction
and outer-side normal → indexed geometry → WebGPU vertex buffer → real Chromium
readback.

## Verification

- `npm run test:unit` — passed, 24 files and 87 tests.
- `npm run check` — passed with zero diagnostics.
- `npm run validate:specs` — passed for 16 capability directories.
- Focused stroke coverage — passed:
  - Statements: 100%
  - Branches: 92.1%
  - Functions: 100%
  - Lines: 100%
- `npm run test:webgpu` — passed, 27 real Chromium WebGPU tests, including the
  clockwise outer-corner fixture.

## Evidence and remaining work

The corrected limited-join behavior is verified for the tested fixture and the
CPU geometry contract. Wider stroke policy, antialiasing, and all remaining
shape acceptance criteria remain separate work. This checkpoint does not promote
the complete `shape-drawing` capability.
