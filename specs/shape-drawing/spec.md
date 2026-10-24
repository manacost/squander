# shape-drawing

## Goal

Draw basic geometric forms without requiring image assets.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Accept the shared readonly `Color` type, constructed through equally supported HSL/HSLA, RGB/RGBA, and hex helpers (AD-024).

- Support lines and filled or outlined rectangles and circles, with explicit color and stroke width.
- Represent squares as rectangles with equal dimensions.
- Use explicit options and preserve global call order.
- Defer dashed strokes and configurable line caps/joins.

## Scenarios

### Outlined marker

The game draws a stroked rectangle around a sprite; its interior stays transparent.

### Mixed primitives

A filled circle is drawn over a rectangle and a line crosses both, with output following call order.

## Acceptance criteria

- Verify equivalent helper-created colors produce equivalent drawing results; examples need not prefer one helper family.

- Render filled and outlined forms; verify interior/exterior sample points and stroke appearance under the documented width convention.
- Render equal-dimension rectangles and verify square geometry.
- Verify one shape’s style does not change the next and shape/sprite overlaps obey call order.

## Usage description

Use line endpoints, rectangle dimensions, and a circle radius. Exact function signatures and coordinate anchors remain illustrative until specified.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Real GPU geometry/appearance fixtures and boundary tests for the agreed invalid-dimension policy.

Use `[shape-drawing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-015. Open: circle/rectangle anchors, stroke alignment, default fixed cap/join behavior, antialiasing, degenerate geometry, and width units under camera scaling.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
