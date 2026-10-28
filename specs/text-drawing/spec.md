# text-drawing

## Goal

Draw changing world-space labels from familiar font assets without making developers author atlases.

## Status

Draft. Target: Phase 2. The first typed font asset and WebGPU text path are
implemented, with basic-Latin preparation, non-evicting atlas rebuilds capped
at 4096×4096, and repeated prepared-glyph rendering verified in Chromium.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Accept the shared readonly `Color` type, constructed through equally supported HSL/HSLA, RGB/RGBA, and hex helpers (AD-024).
- Color helpers validate at construction and throw for invalid inputs, including nonfinite numbers and alpha outside 0–1; finite hue wraps around a full turn (AD-025).

- Accept bundled font URLs, including npm/Fontsource-style bundler URL imports; core loading remains independent of Vite.
- Permit Canvas 2D during font preparation; all world text presentation uses WebGPU.
- Prepare reusable glyph atlases during loading with a configurable character set and basic Latin default. Prepare additional supported glyphs automatically when needed.
- Changing a string made of prepared glyphs reuses their textures; do not regenerate a whole-label texture for every score update.
- Support position, font size, color, and camera transforms; defer wrapping and rich layout.
- Keep the public font handle independent of source/preparation format. Build-time atlas generation remains deferred.
- Do not promise arbitrary script shaping, fallback, or all-font glyph coverage from basic glyph preparation.

## Scenarios

### Changing score

After digits are prepared, a counter changes from 100 to 101 without rasterizing or uploading new glyph images.

### Unexpected name

A label introduces a supported glyph outside the prepared set. The cache adds it under the defined readiness policy and reuses it thereafter.

### Font not ready

Font loading fails during required setup; preparation must not silently bake a fallback font.

## Acceptance criteria

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify equivalent helper-created colors produce equivalent drawing results; examples need not prefer one helper family.
- Verify color construction rejects invalid alpha and nonfinite channels with informative errors, accepts alpha endpoints, and treats hue values separated by a full turn as equivalent.

- Load a bundled font and render labels at specified locations/colors with the camera applied.
- Observe glyph preparation/upload counts while changing prepared-digit strings: no new glyph texture work occurs.
- Request a supported unprepared glyph and verify it is cached for later reuse.
- Verify failed font loading reaches asset failure handling without silently using an unrelated face.
- Demonstrate scaling limits and use visual tolerances appropriate to the pinned rasterization environment.

## Usage description

Illustrative: labels: font(font_url), then draw.text(labels, "Treasure", { x: 100, y: 80, size: 20 }). Applications may prewarm expected characters during loading.

## Test references

The asset-loading unit suite covers owned font handles. The real WebGPU fixture
[`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
font creation from a browser font source, glyph atlas sampling, repeated text
rendering, and atlas reuse. Existing legacy tests are not claimed as coverage.
Remaining planned verification includes bundled URL loading, automatic new-glyph
preparation, typed capacity failure, font-load failure, and camera/readback
tolerances.

The public type coverage is in [`type-tests/phase-2-runtime.ts`](../../type-tests/phase-2-runtime.ts).

Use `[text-drawing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-016 supersedes the initial supplied-bitmap-only plan. Open: atlas size/eviction, glyph readiness on first draw, base resolution vs requested size, weights/styles, initial language support, missing-glyph policy, and whether supplied atlas import also ships. BMFont JSON was proposed but not accepted.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
