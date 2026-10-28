# shape-drawing

## Goal

Draw basic geometric forms without requiring image assets.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Basic shape draw APIs submit frame-local commands, capture input values at submission, return no disposable resource, and create no per-call textures (AD-037). Renderer-owned buffer management stays internal.

- Use flat ends for open strokes and sharp joins with a fixed limit and bevel fallback for excessive spikes (AD-031). The exact limit remains open; rounded/configurable styles are deferred.

- Measure stroke width in world units and scale it with the geometry and camera zoom (AD-030). Constant screen thickness is a future option.

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Accept the shared readonly `Color` type, constructed through equally supported HSL/HSLA, RGB/RGBA, and hex helpers (AD-024).
- Color helpers validate at construction and throw for invalid inputs, including nonfinite numbers and alpha outside 0–1; finite hue wraps around a full turn (AD-025).

- Support lines and filled or outlined rectangles and circles, with explicit color and stroke width.
- Place rectangles by a starting corner `(x, y)` with finite signed width and height; normalize their bounds internally. Negative width extends left, negative height extends up. Circles use their center and radius; lines use two explicit endpoints (AD-028, refined by AD-032).
- Throw for negative radii, negative stroke widths, and nonfinite geometry values. Negative finite positions are valid (AD-032).
- For otherwise valid inputs, draw nothing for zero-area rectangles, zero-radius circles, zero-width strokes, and zero-length lines. Zero-size rectangle/circle behavior applies to outlines as well as fills; zero stroke width does not suppress a separately requested fill.
- Represent squares as rectangles with equal dimensions.
- Use explicit options and preserve global call order.
- Center strokes on the geometric boundary or line centerline, with half the width on each side (AD-029).
- Defer inside/outside alignment, dashed strokes, and configurable line caps/joins; see the [future-capability log](../../specifications/phase-3-candidates.md).

## Scenarios

### Outlined marker

The game draws a stroked rectangle around a sprite; its interior stays transparent.

### Predictable placement

A rectangle at (10, 20) with width 30 and height 40 has geometric bounds from
(10, 20) to (40, 60). A circle centered at (50, 60) with radius 10 has geometric
bounds from (40, 50) to (60, 70). Stroke extent is governed separately by alignment.

### Drawing backwards and shrinking to zero

A selection rectangle starts at (100, 80) and extends by (-30, -20), covering the
same bounds as a rectangle at (70, 60) with dimensions (30, 20). Either dimension
can reach zero during dragging; the zero-area rectangle draws nothing. A negative
circle radius instead throws, as does an infinite coordinate.

### Centered circle outline

A circle with radius 10 and stroke width 4 has an inner stroke radius of 8 and an
outer radius of 12. Changing the stroke width does not move its centerline.

### Mixed primitives

A filled circle is drawn over a rectangle and a line crosses both, with output following call order.

## Acceptance criteria

- Draw the same mutable circle-data object repeatedly with changed position/radius. Verify each draw uses its submitted values without requiring a persistent circle handle or creating a texture per call.

- Verify open strokes stop at their endpoints, rectangle outlines retain square corners, and sufficiently acute joins fall back to bevels. Add boundary fixtures once the miter limit is defined.

- With fixed viewport scaling and display density, verify a width-2 stroke has twice the screen thickness at camera zoom 2 versus zoom 1, allowing the stated rasterization tolerance.

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify equivalent helper-created colors produce equivalent drawing results; examples need not prefer one helper family.
- Verify color construction rejects invalid alpha and nonfinite channels with informative errors, accepts alpha endpoints, and treats hue values separated by a full turn as equivalent.

- Render filled and outlined forms; verify interior/exterior sample points and stroke appearance under the documented width convention.
- Verify rectangle and circle placement against the stated geometric bounds, and line geometry against both supplied endpoints, independently of stroke extent.
- Verify the radius-10, width-4 circle outline against inner/outer radii 8 and 12, and verify straight stroke edges lie half a width from the centerline.
- Verify all four rectangle dimension-sign combinations against equivalent positive-dimension bounds for both filled and outlined draws.
- Verify invalid geometry throws, including nonfinite positions and negative radii/stroke widths; invalid inputs do not become acceptable merely because another dimension is zero.
- Verify valid zero-size shapes, zero-width strokes, and coincident-endpoint lines leave existing output unchanged. Verify a zero-width stroke does not suppress a separately requested fill.
- Render equal-dimension rectangles and verify square geometry.
- Verify one shape’s style does not change the next and shape/sprite overlaps obey call order.

## Usage description

Supply a rectangle’s starting corner and signed dimensions, a circle’s center and radius, or a line’s two endpoints. No origin option is needed for basic placement. Exact function signatures and transformation pivots remain open.

## Test references

Current verification:

- [`src/lib/core/runtime/shapes.test.ts`](../../src/lib/core/runtime/shapes.test.ts)
  covers signed rectangle normalization, zero-area behavior, finite primitive
  validation, stroke widths, snapshots, and opacity in the
  `[shape-drawing] primitive validation` suite.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts)
  verifies a filled rectangle submitted after a translucent sprite in the
  `[shape-drawing]` suite.

CPU validation and filled rectangle/circle/line plus rectangle- and
circle-outline GPU command paths are implemented. Width scaling and degenerate
stroke behavior have focused GPU evidence; remaining cap/join rules and
complete shape promotion remain unimplemented.
Shared color construction is covered independently by
[`src/lib/core/runtime/colors.test.ts`](../../src/lib/core/runtime/colors.test.ts),
and rectangle fills consume it internally.

## Notes

AD-015 and AD-028 through AD-032. Open: transformation pivots, the exact miter limit, antialiasing, very wide strokes, and nonuniform object scaling. Reusable polygon/path validation is defined separately.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
