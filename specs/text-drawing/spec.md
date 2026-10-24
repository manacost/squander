# text-drawing

## Goal

Draw changing world-space labels from familiar font assets without making developers author atlases.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

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

- Load a bundled font and render labels at specified locations/colors with the camera applied.
- Observe glyph preparation/upload counts while changing prepared-digit strings: no new glyph texture work occurs.
- Request a supported unprepared glyph and verify it is cached for later reuse.
- Verify failed font loading reaches asset failure handling without silently using an unrelated face.
- Demonstrate scaling limits and use visual tolerances appropriate to the pinned rasterization environment.

## Usage description

Illustrative: labels: font(font_url), then draw.text(labels, "Treasure", { x: 100, y: 80, size: 20 }). Applications may prewarm expected characters during loading.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Browser font-load/rasterization/GPU fixtures, cache-behavior tests, and typed font-handle tests.

Use `[text-drawing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-016 supersedes the initial supplied-bitmap-only plan. Open: atlas size/eviction, glyph readiness on first draw, base resolution vs requested size, weights/styles, initial language support, missing-glyph policy, and whether supplied atlas import also ships. BMFont JSON was proposed but not accepted.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
