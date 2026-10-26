# Phase 2 filled and outlined primitive checkpoint

Status: **Filled rectangle, circle, line, rectangle-outline, and circle-outline GPU ordering verified; shape-drawing remains Draft**.

## Pre-slice contract checkpoint

- Reused signed rectangle normalization and zero-area rules from `shapes.ts`.
- Used the shared readonly `Color` contract and per-draw opacity.
- Kept the command frame-local and submitted it through the same render pass as
  sprites, preserving source-over order.
- Used one renderer-owned white texture for solid fills; no rectangle call creates
  a texture.

## Implemented slice

- Added a rectangle render command to the low-level renderer.
- Normalized signed rectangle bounds into a transformed sprite-style quad.
- Added a filled circle command using center/radius geometry and shader-side
  circular coverage.
- Added a flat-ended line command using explicit endpoints and centered stroke
  width.
- Added a centered rectangle-outline command with transparent interior coverage.
- Added a centered circle-outline command with radial interior exclusion.
- Added mixed sprite/rectangle source-over readback coverage.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'shape-drawing'` passed (1 test).
- The full real WebGPU run `npm run test:webgpu` passed 13 tests, including the
  mixed rectangle, filled-circle, line, rectangle-outline, and circle-outline
  fixtures.
- The fixture independently expects red at effective alpha 0.5 followed by green
  at effective alpha 0.5 to produce `[64, 128, 0, 255]` over the opaque clear.
- `npm run test:unit`: passed, 17 files and 48 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `draw_commands` → signed rectangle
normalization → renderer-owned solid texture → shared placement/UV path → one
source-over render pass after the sprite → exact current-texture readback →
independent pixel assertion.

## Known gaps and gate

- Configurable stroke joins/caps, antialiasing, and the final public shape API
  remain unimplemented.
- Go/no-go: **continue shape work, but do not promote `shape-drawing`.**
