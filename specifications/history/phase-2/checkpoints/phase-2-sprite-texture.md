# Phase 2 sprite texture checkpoint

Status: **Persistent texture upload and atlas sampling verified**.

## Implemented slice

- Added persistent `GPUTexture` creation from RGBA pixel data.
- Connected texture lifetime to the explicit resource owner and draw leases.
- Added a minimal WebGPU textured pipeline and full-canvas draw command.
- Added atlas-region UV selection, tint, opacity, linear sampler creation, and
  deterministic readback.
- Preserved the internal package boundary; no public export migration yet.

## Evidence

- `npm run test:webgpu`: passed; 4 tests passed, including the independent
  baseline probe, clear/readback fixture, full-texture fixture, and
  `[sprite-drawing]` atlas/tint/opacity fixture.
- The fixture verifies a known `[12, 34, 56, 255]` texture survives upload,
  sampling, rendering, and readback.
- The atlas fixture verifies blue-region selection and alpha composition:
  tint alpha 1 multiplied by opacity 0.5 produces `[0, 0, 255, 128]`.
- `npm run check`: passed with zero diagnostics.
- Targeted ESLint and Prettier checks passed.

## Trace

The verified path is Playwright → trusted Vite origin → renderer module →
resource owner → `GPUTexture` upload → sampler/bind group → render pipeline →
exact canvas texture copy → mapped readback → pixel assertion.

## Gate

The next sprite slice must add explicit placement transforms, origin handling,
flips, and mixed draw ordering with independent GPU fixtures. Atlas sampling,
tint, and opacity alone do not prove those contracts.
