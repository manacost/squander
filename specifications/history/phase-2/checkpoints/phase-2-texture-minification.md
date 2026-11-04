# Phase 2 texture minification checkpoint

Status: **Nearest and linear minification verified without mipmaps; texture-filtering remains Draft**.

## Pre-slice contract checkpoint

- Reused the existing no-mipmap Phase 2 policy.
- Kept nearest and linear choices per texture and independent from other draws.
- Used a 2×2 source reduced to one pixel with independently calculated average
  color for the linear case.

## Implemented slice

- Added a real GPU minification fixture for nearest and linear samplers.
- Verified linear reduction produces the four-corner average `[128, 128, 128,
255]`, while nearest remains a distinct opaque texel.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'minification'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 16 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 17 files and 48 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → 2×2 texture upload → independent
nearest/linear sampler creation → 1×1 draw submission → exact readback →
nearest-versus-average pixel assertions.

## Known gaps and gate

- Mipmaps and font-atlas filtering remain unverified and outside this slice.
- Go/no-go: **continue to the next independent capability slice; do not promote
  `texture-filtering`.**
