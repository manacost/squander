# paths-and-polygons

## Goal

Reuse custom geometry for filled polygons and stroked curved paths.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Support filled and outlined simple polygons, including concave polygons, without holes or self-intersections.
- Support stroke-only paths with straight segments, quadratic and cubic Bézier curves, and explicit closure.
- Create reusable geometry and draw it repeatedly with explicit transforms/styles. Rebuild when shape data changes.
- Filled curved paths, holes, and fill rules are Phase 3 candidates.

## Scenarios

### Concave marker

A game creates an L-shaped polygon once and draws it at several locations; its concavity stays empty.

### Curved route

A reusable path combines straight and curved segments. Repeated drawing changes its placement without changing the path shape.

## Acceptance criteria

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Render a concave polygon and test known inside/outside points, including its notch.
- Render quadratic/cubic curves and closure with approved visual tolerances; curves meet specified endpoints.
- Draw one geometry with distinct transforms and styles; neither draw mutates the reusable definition.
- Verify shape changes rebuild geometry while unchanged repeated draws reuse preparation; do not prescribe an exact triangulation algorithm.

## Usage description

Create geometry independently of the draw callback, then submit it with per-draw options. Use polygons for filled custom forms and paths for curved strokes.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Triangulation invariants (area/coverage) and curve endpoint tests; real GPU concavity/curve fixtures; geometry reuse checks.

Use `[paths-and-polygons]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-015. Open: command format, tessellation tolerance under zoom, geometry ownership/disposal, winding rules, and behavior for unsupported/degenerate inputs.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
