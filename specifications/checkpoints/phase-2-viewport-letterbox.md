# Phase 2 viewport letterbox checkpoint

Status: **Fixed-fit logical-to-physical letterbox mapping verified; viewport-sizing remains Draft**.

## Pre-slice contract checkpoint

- Logical coordinates remain independent from physical canvas dimensions.
- Fixed-fit content is centered with bars outside the content bounds.
- DPR is applied to physical surface sizing, not logical coordinates.
- This slice does not claim resize observers or DOM overlay integration.

## Implemented slice

- Added optional viewport mapping to the low-level renderer.
- Configured physical canvas/readback dimensions from the viewport descriptor.
- Applied content scale and letterbox offsets to command geometry.
- Added a real GPU fixture for a 4×2 logical view in a 4×4 physical surface.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'letterbox'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 19 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 18 files and 51 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`ViewportSize` descriptor → renderer physical surface configuration → logical
command point → content scale/letterbox offset → clip coordinates → exact GPU
readback → content/bar pixel assertions.

## Known gaps and gate

- Responsive runtime updates, resize/DPR event handling, and DOM overlay bounds
  remain unimplemented.
- Go/no-go: **continue viewport runtime integration; do not promote
  `viewport-sizing`.**
