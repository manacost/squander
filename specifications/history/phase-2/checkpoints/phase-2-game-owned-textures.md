# Phase 2 game-owned renderer and dynamic texture checkpoint

## Scope

- Added injectable `RendererFactory` support to `create_game`, defaulting to the
  production WebGPU renderer factory.
- Renderer configuration is required at game creation; unit tests inject a fake
  renderer so lifecycle behavior remains deterministic and GPU-independent.
- Setup receives the ready renderer and the returned game exposes it after
  readiness.
- Added `assets.load_texture(Blob, options)` returning an explicitly owned
  `ResourceHandle<WebGpuTexture>`.
- Dynamic texture loads pass filtering and cancellation through to image decode,
  maintain internal cancellation controllers for cache disposal, release late
  textures after disposal or cancellation, and dispose the renderer exactly once
  after game-owned resources are released.

## Code trace

`create_game(renderer options, renderer_factory)` → renderer readiness promise →
`create_asset_cache(renderer promise)` → `assets.load_texture(Blob|File)` →
`decode_image_source(internal abort signal)` → `renderer.create_texture_from_blob`
→ game-owned resource handle → explicit release/game disposal → renderer
disposal.

## Verification

- `npm run test:unit` — passed, 26 files and 110 tests.
- `npm run test:type` — passed, including Blob/File handle inference and invalid-input rejection.
- `npm run check` — passed with zero Svelte diagnostics.
- `npm run validate:specs` — passed for 16 capability directories.
- `npm run test:webgpu -- --grep 'dynamic-assets|sprite-drawing|texture-filtering|viewport-sizing'` — passed, 13 real Chromium WebGPU tests, including the game-owned Blob/File fixture.

## Coverage and evidence gaps

The modified `asset_loading.ts` and `game.ts` pass the per-file four-metric
threshold. The renderer implementation is only minimally represented in unit
coverage; browser tests provide the required GPU evidence but are not merged
into the current unit coverage report. Existing color, geometry, and viewport
branch gaps remain.

The focused game coverage result is 98.86% statements, 91.66% branches, 100%
functions, and 98.82% lines.

The malformed dynamic-image browser fixture and manifest type tests are now
covered by the focused retry and type-test checkpoints. The supported
Blob/File capability is complete; typed manifest texture descriptors remain
outside this slice.

## Go/no-go

**Promote `dynamic-assets`.** Game-owned Blob/File loading, malformed-input
retry, ownership, disposal, and deterministic real-GPU readback are evidenced.
