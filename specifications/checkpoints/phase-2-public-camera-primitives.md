# Phase 2 public camera and primitive integration checkpoint

## Scope

- Promoted camera creation and camera value types through the public core
  entrypoint.
- Promoted shared color helpers, angle conversion, filtering types, primitive
  draw types, path/polygon/stroke/triangle commands, and owned geometry command
  types through the same seam.
- Added public type coverage for camera creation, color helpers, degrees, and a
  primitive render command.
- Reused the existing renderer implementation and real GPU suites rather than
  introducing duplicate public wrappers.

## Code trace

`src/lib/core/index.ts` public exports → camera/color/angle/filtering and draw
command interfaces → `WebGpuRenderer.draw_commands` → camera world transform,
primitive validation/tessellation, geometry ownership, GPU submission, and
deterministic readback.

## Verification

- `npm run test:type` — passed.
- `npm run check` — passed with zero Svelte diagnostics.
- Focused CPU tests for camera, shapes, and polygons — passed, 12 tests.
- `npm run test:webgpu -- --grep 'camera-2d|shape-drawing|paths-and-polygons|resource-ownership'` — passed, 15 real Chromium WebGPU tests.
- Mixed sprite/rectangle/circle source-over ordering fixture — passed with
  independently calculated reversed-order readback values.

## Evidence gaps

Public mixed primitive/text ordering, broader camera integration across all draw
types, final path update API decisions, and complete capability promotion remain
outstanding. Existing global coverage gaps and separate renderer browser
coverage remain documented.

## Go/no-go

**Continue.** The public camera and primitive command seam and mixed source-over
ordering are verified. Proceed with remaining public path/polygon behavior and
capability promotion evidence.
