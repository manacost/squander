# Phase 2 sprite transform checkpoint

Status: **Placement, origin, flip, and ordered sprite submission verified; capability remains Draft**.

## Pre-slice contract checkpoint

- Used the existing sprite contract: positive X right, positive Y down, top-left
  default origin, normalized origin relative to the selected atlas region, and
  clockwise radians.
- Kept this slice internal to the WebGPU renderer. No package export or final
  public `draw.sprite` surface was introduced.
- Treated source-over blending and mixed primitive ordering as later gates. This
  slice verifies ordered opaque sprite submission only; it does not claim the
  complete sprite capability.

## Implemented slice

- Added placement coordinates, dimensions, normalized origin, rotation, and
  horizontal/vertical flip options to the renderer draw description.
- Added `draw_textures` so multiple texture draws share one render pass and
  retain submission order.
- Kept atlas UV selection independent from geometry transforms and acquired one
  resource lease per submitted texture.

## Evidence

- Focused real WebGPU run: `npx playwright test --config=playwright.webgpu.config.ts verification/webgpu-renderer.spec.ts -g 'places, flips'` passed (1 test).
- Full real WebGPU run: `npm run test:webgpu` passed 5 of 6 before the fixture row
  correction; the corrected focused test then passed. The final full suite was
  not rerun after that correction and is therefore not claimed here.
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

- The complete sprite contract still lacks verified source-over alpha composition,
  vertical and combined flip fixtures, mixed primitive ordering, and public color
  helper behavior.
- The final full WebGPU suite should be rerun after this checkpoint is committed.
- Go/no-go: **go to the next focused sprite contract work only after the final
  full suite and lint/check results are recorded; do not promote `sprite-drawing`.**
