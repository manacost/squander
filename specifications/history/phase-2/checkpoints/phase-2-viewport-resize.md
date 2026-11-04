# Phase 2 viewport resize checkpoint

Status: **Explicit runtime resize and DPR mapping verified; viewport-sizing remains Draft**.

## Pre-slice contract checkpoint

- Resize is explicit and synchronous on the renderer.
- Physical canvas/readback dimensions may change while logical placement remains
  in the viewport’s logical coordinate system.
- DPR affects physical resolution and mapping, not logical coordinates.
- Automatic observers and responsive policy remain outside this slice.

## Implemented slice

- Added `renderer.resize(viewport)` to reconfigure the canvas and WebGPU context.
- Updated readback dimensions and logical-to-physical mapping after resize.
- Added a real GPU fixture that resizes from 1× to 2× DPR and checks a logical
  landmark at its expected physical location.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'runtime resize'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 20 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 18 files and 51 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`renderer.resize(ViewportSize)` → canvas/context reconfiguration → mutable
surface/readback dimensions → logical content scale and DPR mapping → draw →
exact readback.

## Known gaps and gate

- Automatic resize observation, responsive logical policy, and DOM overlay
  alignment remain unimplemented.
- Go/no-go: **continue viewport integration; do not promote `viewport-sizing`.**
