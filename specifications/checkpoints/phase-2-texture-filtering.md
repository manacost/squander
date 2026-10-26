# Phase 2 texture filtering checkpoint

Status: **Nearest and linear magnification verified; texture-filtering remains Draft**.

## Pre-slice contract checkpoint

- Reused the existing policy: linear defaults, nearest shorthand, and
  independent magnification/minification fields.
- Kept texture storage shared; each draw selects its texture’s sampler policy.
- This slice verifies magnification only and does not claim mipmaps or complete
  downscaling behavior.

## Implemented slice

- Added a real GPU fixture with an asymmetric red/blue texture.
- Verified a nearest sample remains a discrete red texel while a linear sample at
  the measured midpoint contains both red and blue channels.
- Verified both textures render in one ordered pass without policy leakage.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'keeps nearest'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 15 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 17 files and 48 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `create_texture` → resolved filtering
policy → per-texture sampler binding → ordered draw pass → exact readback →
independent nearest/midpoint pixel assertions.

## Known gaps and gate

- Minification/downscaling, mipmaps, and font-atlas filtering remain unverified.
- Go/no-go: **continue to the next independent capability slice; do not promote
  `texture-filtering` yet.**
