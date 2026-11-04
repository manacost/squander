# Phase 2 public sprite and viewport checkpoint

## Scope

- Added `get_viewport()` to the WebGPU renderer interface.
- Added game-owned `resize(viewport)` and `get_viewport()` methods that delegate
  through the renderer only after readiness.
- Normalized renderer initialization to always maintain an observable viewport;
  omitted viewport options use responsive dimensions at DPR 1.
- Preserved existing sprite draw options for regions, tint, opacity, transforms,
  normalized origins, flips, filtering, and submission order.
- Added public type and lifecycle tests plus a real browser fixture covering
  fixed-fit initialization, responsive resize, DPR changes, and game ownership.

## Code trace

`create_game(renderer options)` → `create_webgpu_renderer` → initial
`ViewportSize` → `game.get_viewport()` / `game.resize(viewport)` → renderer
canvas reconfiguration → existing sprite draw/readback path.

## Verification

- `npm run test:unit -- src/lib/core/runtime/game.test.ts` — passed, 14 tests.
- `npm run test:type` — passed, including the public resize and viewport types.
- `npm run check` — passed with zero Svelte diagnostics.
- `npm run test:webgpu -- --grep 'viewport-sizing'` — passed, 3 real Chromium WebGPU tests.
- `npm run validate:specs` — passed previously for 16 capability directories.
- Runtime coverage — `game.ts`: 100% statements, 95% branches, 100% functions,
  100% lines; `asset_loading.ts` remains above 90% for all four metrics.

## Evidence gaps

Automatic DOM resize observation, DOM overlay alignment, mixed primitive/text
ordering, and complete capability promotion remain unimplemented. The global
runtime coverage command retains the previously recorded unrelated branch gaps
and unmerged WebGPU renderer coverage; renderer correctness is covered separately
by real Chromium readback.

## Go/no-go

**Continue.** The public sprite/viewport seam is verified. Proceed to public
camera, primitive, path, and polygon integration.
