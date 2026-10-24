# sprite-drawing

## Goal

Draw composable textured sprites in predictable order with explicit placement and appearance.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Draw textures or atlas regions with tint, opacity, rotation, scale, and flipping.
- Preserve call order across sprites, shapes, and text; batching must preserve the visible result.
- Use positive X right and positive Y down. Default sprite origin to top-left; a normalized origin applies relative to the selected region.
- The origin anchors positioning, scaling, and rotation. Explicit draw options do not leak into subsequent calls.

## Scenarios

### Centered atlas sprite

A selected atlas region uses origin (0.5, 0.5). Rotating/scaling keeps its center at the specified position without using the full atlas size.

### Mixed overlap

A sprite, a translucent shape, and text overlap. Their visible composition follows submission order even when the renderer batches work.

## Acceptance criteria

- Render a distinctly colored atlas fixture and verify the selected region, flipping, and origin placement under scale/rotation.
- Render overlapping primitives in two call orders and verify the expected compositing difference.
- Draw a tinted/transformed sprite then an unstyled sprite; the second uses defaults.
- Check CPU transform calculations against independent expected points, not a duplicate of the renderer algorithm.

## Usage description

Illustrative: draw.sprite(hero, { x: 100, y: 80, origin: { x: 0.5, y: 0.5 } }). Draw later items after earlier ones to place them above.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Real GPU pixel fixtures for regions, transforms, opacity, and mixed order; focused math tests.

Use `[sprite-drawing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-008 and AD-014. Open: rotation units/direction (radians were proposed, not confirmed), alpha/color representation, atlas descriptor, and flip/origin interaction.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
