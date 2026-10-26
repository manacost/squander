# Phase 2 camera scope checkpoint

Status: **Synchronous camera scopes and one GPU transform verified; camera-2d remains Draft**.

## Pre-slice contract checkpoint

- `camera.draw(callback)` is synchronous and restores the prior scope on normal
  completion and exceptions.
- Nested scopes replace rather than compose, then restore the outer camera.
- Renderer geometry snapshots the active camera at command submission; async work
  must not be used to extend a scope.
- Unscoped commands retain logical screen coordinates.

## Implemented slice

- Added nested active-camera scope tracking and restoration.
- Applied active camera transforms to renderer command quad corners.
- Added CPU scope/error tests and a real GPU centered-landmark fixture.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'camera scope'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 17 tests.
- `npm run test:unit`: passed, 18 files and 51 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`camera.test.ts`/`verification/webgpu-renderer.spec.ts` → `camera.draw` active
scope → renderer command capture → `world_to_screen` per quad corner → clip
coordinates → render pass → exact readback.

## Known gaps and gate

- Camera transforms across every public draw type, viewport/letterbox runtime
  integration, and final public package exports remain unimplemented.
- Go/no-go: **continue camera/viewport integration; do not promote `camera-2d`.**
