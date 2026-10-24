# shape-drawing

## Goal

Draw basic geometric forms without requiring image assets.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Measure stroke width in world units and scale it with the geometry and camera zoom (AD-030). Constant screen thickness is a future option.

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Accept the shared readonly `Color` type, constructed through equally supported HSL/HSLA, RGB/RGBA, and hex helpers (AD-024).
- Color helpers validate at construction and throw for invalid inputs, including nonfinite numbers and alpha outside 0–1; finite hue wraps around a full turn (AD-025).

- Support lines and filled or outlined rectangles and circles, with explicit color and stroke width.
- Place rectangles by their top-left `(x, y)` with width and height, circles by their center `(x, y)` with radius, and lines by two explicit endpoints (AD-028).
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

### Centered circle outline

A circle with radius 10 and stroke width 4 has an inner stroke radius of 8 and an
outer radius of 12. Changing the stroke width does not move its centerline.

### Mixed primitives

A filled circle is drawn over a rectangle and a line crosses both, with output following call order.

## Acceptance criteria

- With fixed viewport scaling and display density, verify a width-2 stroke has twice the screen thickness at camera zoom 2 versus zoom 1, allowing the stated rasterization tolerance.

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify equivalent helper-created colors produce equivalent drawing results; examples need not prefer one helper family.
- Verify color construction rejects invalid alpha and nonfinite channels with informative errors, accepts alpha endpoints, and treats hue values separated by a full turn as equivalent.

- Render filled and outlined forms; verify interior/exterior sample points and stroke appearance under the documented width convention.
- Verify rectangle and circle placement against the stated geometric bounds, and line geometry against both supplied endpoints, independently of stroke extent.
- Verify the radius-10, width-4 circle outline against inner/outer radii 8 and 12, and verify straight stroke edges lie half a width from the centerline.
- Render equal-dimension rectangles and verify square geometry.
- Verify one shape’s style does not change the next and shape/sprite overlaps obey call order.

## Usage description

Supply a rectangle’s top-left position and dimensions, a circle’s center and radius, or a line’s two endpoints. No origin option is needed for basic placement. Exact function signatures and transformation pivots remain open.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Real GPU geometry/appearance fixtures and boundary tests for the agreed invalid-dimension policy.

Use `[shape-drawing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-015, AD-028, and AD-029. Open: transformation pivots, default fixed cap/join behavior, antialiasing, degenerate geometry, and nonuniform object scaling.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
