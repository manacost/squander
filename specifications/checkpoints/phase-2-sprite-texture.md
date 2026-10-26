# Phase 2 sprite texture checkpoint

Status: **Persistent texture upload and sampling verified**.

## Implemented slice

- Added persistent `GPUTexture` creation from RGBA pixel data.
- Connected texture lifetime to the explicit resource owner and draw leases.
- Added a minimal WebGPU textured pipeline and full-canvas draw command.
- Added linear sampler creation and deterministic readback.
- Preserved the internal package boundary; no public export migration yet.

## Evidence

- `npm run test:webgpu`: passed; 3 tests passed, including the independent
  baseline probe, clear/readback fixture, and `[sprite-drawing]` texture fixture.
- The fixture verifies a known `[12, 34, 56, 255]` texture survives upload,
  sampling, rendering, and readback.
- `npm run check`: passed with zero diagnostics.
- Targeted ESLint and Prettier checks passed.

## Trace

The verified path is Playwright → trusted Vite origin → renderer module →
resource owner → `GPUTexture` upload → sampler/bind group → render pipeline →
exact canvas texture copy → mapped readback → pixel assertion.

## Gate

The next sprite slice must add atlas regions, explicit transform/tint/opacity
commands, and mixed draw ordering with independent GPU fixtures. Full-texture
sampling alone does not prove those contracts.
