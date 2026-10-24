# paths-and-polygons

## Goal

Reuse custom geometry for filled polygons and stroked curved paths.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

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
