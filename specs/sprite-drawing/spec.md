# sprite-drawing

## Goal

Draw composable textured sprites in predictable order with explicit placement and appearance.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Accept the shared readonly `Color` type, constructed through equally supported HSL/HSLA, RGB/RGBA, and hex helpers (AD-024).
- Color helpers validate at construction and throw for invalid inputs, including nonfinite numbers and alpha outside 0–1; finite hue wraps around a full turn (AD-025).

- Draw textures or atlas regions with tint, opacity, rotation, scale, and flipping.
- Preserve call order across sprites, shapes, and text; batching must preserve the visible result.
- Use positive X right and positive Y down. Default sprite origin to top-left; a normalized origin applies relative to the selected region.
- Express rotation in radians, with positive angles rotating clockwise in the positive-Y-down coordinate system.
- Provide `degrees(value)` to convert degrees to radians; `degrees(90)` is a clockwise quarter-turn.
- Explicit horizontal/vertical flips mirror the image within the selected region’s existing bounds. They do not move the geometry, position, or origin, including under scale/rotation.
- The origin anchors positioning, scaling, and rotation. Explicit draw options do not leak into subsequent calls.

## Scenarios

### Centered atlas sprite

A selected atlas region uses origin (0.5, 0.5). Rotating/scaling keeps its center at the specified position without using the full atlas size.

### Clockwise quarter-turn

A point to the right of the sprite origin rotates below it after a positive quarter-turn.
Passing `degrees(90)` produces the same transform as passing `Math.PI / 2`.

### Flipping with an off-center origin

A character uses an off-center origin. Flipping horizontally reverses its image
inside the same sprite rectangle, preserving the anchored position and transformed
bounds. Atlas flips stay within the selected region.

### Mixed overlap

A sprite, a translucent shape, and text overlap. Their visible composition follows submission order even when the renderer batches work.

## Acceptance criteria

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify equivalent helper-created colors produce equivalent drawing results; examples need not prefer one helper family.
- Verify color construction rejects invalid alpha and nonfinite channels with informative errors, accepts alpha endpoints, and treats hue values separated by a full turn as equivalent.

- Render a distinctly colored atlas fixture and verify the selected region, flipping, and origin placement under scale/rotation.
- With an asymmetric atlas fixture and an off-center origin, verify horizontal, vertical, and combined flips reverse the image while preserving transformed bounds and the anchor.
- Render overlapping primitives in two call orders and verify the expected compositing difference.
- Draw a tinted/transformed sprite then an unstyled sprite; the second uses defaults.
- Verify `degrees(0)`, `degrees(90)`, `degrees(-90)`, and `degrees(360)` against expected radian values with numeric tolerance.
- Verify positive quarter-turn rotation maps an origin-relative point (1, 0) to (0, 1), and a negative quarter-turn maps it to (0, -1).
- Check CPU transform calculations against independent expected points, not a duplicate of the renderer algorithm.

## Usage description

Illustrative: draw.sprite(hero, { x: 100, y: 80, origin: { x: 0.5, y: 0.5 }, rotation: degrees(90) }). Draw later items after earlier ones to place them above.

## Test references

Current verification:

- [`verification/webgpu-renderer.spec.ts`](../../verification/webgpu-renderer.spec.ts)
  verifies persistent texture upload, full-canvas sampling, atlas-region UV
  selection, tint, opacity, ownership release, and deterministic pixel readback
  in the `[sprite-drawing]` suites.

Placement transforms, origins, flips, and mixed primitive ordering remain
unimplemented.

## Notes

AD-008, AD-014, AD-022, and AD-023. The current GPU slice accepts only a
full-texture draw with linear sampling; atlas descriptors, color encoding,
opacity, transforms, and flips remain open.
Negative-scale behavior remains an API design detail; explicit flips do not imply geometry mirroring.
The angle convention and helper are agreed; the illustrative draw-option spelling and any branded angle type remain API design details.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
