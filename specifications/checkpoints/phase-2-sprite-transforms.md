# Phase 2 sprite transform checkpoint

Status: **Placement, origin, flip, ordered submission, and source-over sprite composition verified; capability remains Draft**.

## Pre-slice contract checkpoint

- Used the existing sprite contract: positive X right, positive Y down, top-left
  default origin, normalized origin relative to the selected atlas region, and
  clockwise radians.
- Kept this slice internal to the WebGPU renderer. No package export or final
  public `draw.sprite` surface was introduced.
- Treated mixed primitive ordering as a later gate. This slice verifies source-over
  composition for sprites only; it does not claim the complete sprite capability.

## Implemented slice

- Added placement coordinates, dimensions, normalized origin, rotation, and
  horizontal/vertical flip options to the renderer draw description.
- Added `draw_textures` so multiple texture draws share one render pass and
  retain submission order.
- Added source-over color and alpha blending to the WebGPU pipeline and a
  two-layer translucent readback fixture.
- Added an asymmetric 2×2 combined horizontal/vertical flip fixture that checks
  all four independently expected output pixels.
- Kept atlas UV selection independent from geometry transforms and acquired one
  resource lease per submitted texture.

## Evidence

- The prior focused real WebGPU run for placement/flip passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 7 tests, including the
  baseline, clear/readback, persistent texture, atlas, source-over, transform,
  and ordered multi-sprite fixtures.
- `npm run check`: passed with zero diagnostics.
- `npm run test:unit`: passed, 16 files and 45 tests.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed, 16 capability directories validated.
- Targeted ESLint, Prettier, and `git diff --check`: passed.
- CPU/type checks before this slice remained passing: `npm run check`,
  `npm run test:unit` (16 files, 45 tests), and `npm run test:type`.
- The transform fixture independently asserted a flipped asymmetric atlas at
  measured pixels and a black untouched pixel. The ordering fixture asserted
  the later blue draw covers the earlier red draw only in its one-pixel region.

## Code trace

`verification/webgpu-renderer.spec.ts` → trusted Vite origin →
`create_webgpu_renderer` → `draw_texture`/`draw_textures` → region and placement
validation → CPU corner transform and UV flip construction → resource leases →
vertex/uniform buffers and bind groups → one render pass in submission order →
exact current-texture copy → mapped readback → independent pixel assertions.

## Known gaps and gate

- The complete sprite contract still lacks mixed primitive ordering and public
  color helper behavior.
- Go/no-go: **go to the next focused sprite contract work only after the final
  full suite and lint/check results are recorded; do not promote `sprite-drawing`.**
