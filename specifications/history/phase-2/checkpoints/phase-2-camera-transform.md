# Phase 2 camera transform checkpoint

Status: **GPU zoom and inverse rotation verified; camera-2d remains Draft**.

## Pre-slice contract checkpoint

- Camera position remains the world point at the logical viewport center.
- Positive zoom magnifies world geometry.
- Positive camera rotation applies inverse rotation to world content in the
  positive-Y-down coordinate system.
- The fixture uses a known world square and independently calculated target and
  opposite pixels.

## Implemented slice

- Reused the active camera scope path for zoom and rotation.
- Added a real GPU landmark fixture for zoom 2 and a positive quarter-turn.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'zoom and inverse'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 18 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 18 files and 51 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`camera.create_camera` → active scope → renderer corner snapshot → camera
world-to-screen zoom/rotation → clip mapping → GPU draw → exact readback.

## Known gaps and gate

- Viewport fitting, letterboxing, resize/DPR integration, and broad primitive
  transform fixtures remain unimplemented.
- Go/no-go: **continue to viewport integration; do not promote `camera-2d`.**
