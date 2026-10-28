# Phase 2 texture filtering checkpoint

Status: **Nearest and linear magnification/minification verified; texture-filtering remains Draft**.

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
- Added a 2×2-to-1×1 fixture that measures linear averaging without mipmaps.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'keeps nearest'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 16 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 17 files and 48 tests.
- `npm run test:type`: passed.
- Spec validation, ESLint, Prettier, and diff checks passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → `create_texture` → resolved filtering
policy → per-texture sampler binding → ordered draw pass → exact readback →
independent nearest/midpoint pixel assertions.

## Known gaps and gate

- Mipmaps remain outside Phase 2 and are explicitly deferred to Phase 4.
- Go/no-go: **promote `texture-filtering`.** Nearest/linear magnification and
  minification, independent per-texture policies, and font-atlas option
  propagation are evidenced without mipmaps.
