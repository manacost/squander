# Phase 2 text drawing checkpoint

## Scope

- Added typed `WebGpuFont`, `FontOptions`, `TextDrawOptions`, and font errors.
- Added `renderer.create_font_from_url` and `assets.load_font` with owned,
  explicitly releasable font handles.
- Prepared glyphs with Canvas 2D, packed them into a non-evicting atlas that
  grows up to 4096×4096, and added automatic preparation for supported glyphs
  requested by later strings.
- Routed text through reusable per-glyph GPU textures so color, opacity,
  viewport, and active camera transforms use the established GPU behavior. The
  packed atlas remains the non-evicting preparation/capacity source; a focused
  Chromium probe showed atlas-region sampling could produce clipped glyphs, so
  draw-time glyph textures avoid that environment-specific defect.

## Code trace

`src/lib/core/index.ts` → `Game.assets.load_font` or
`WebGpuRenderer.create_font_from_url` → `FontFace` loading and Canvas 2D glyph
preparation → `WebGpuRenderer.draw_text` → reusable glyph texture draws → source-
over WebGPU sampling and deterministic readback.

## Verification

- `npm run test:type` — passed.
- `npm run check` — passed with zero Svelte diagnostics.
- The focused real-WebGPU font test first failed with 351 lit pixels for a
  default-filtered glyph against the `<330` legibility guard, then passed after
  nearest filtering and reusable glyph textures were added.
- The composition playground now renders a readable `P`, digits, common
  symbols, uppercase letters, and lowercase letters; its screenshot baseline
  covers the static character sheet.
- Focused asset/game unit tests — passed, 26 tests.
- `npm run test:webgpu -- --grep 'text-drawing'` — passed, one real Chromium
  WebGPU test covering font loading, glyph sampling, repeated rendering, and
  atlas identity reuse, including automatic preparation of a newly requested
  glyph.
- `npm run test:coverage:runtime` — passed its 113 tests and recorded
  `font_loading.ts` at 7.61% statements, 0% branches, 0% functions, and
  8.88% lines. The repository threshold command remains blocked by the
  pre-existing color/path/triangulation/viewport gaps and the intentionally
  unmerged browser-only renderer coverage; the new font file also requires
  focused CPU coverage before promotion.

## Evidence gaps

`text-drawing` remains Draft. A bundled font URL fixture, automatic addition of
an unprepared glyph, typed 4096×4096 capacity failure, explicit font-load
failure behavior, camera-specific text fixture, and per-file four-metric
coverage are still required before promotion. The current browser fixture uses
Chromium's local Arial font source because the repository has no bundled font
binary.

## Go/no-go

**Continue.** The core font/atlas/text rendering seam is verified. Proceed with
the remaining bundled-font, capacity, camera, and coverage evidence before
capability promotion.
