# paths-and-polygons

## Goal

Reuse custom geometry for filled polygons and stroked curved paths.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use flat ends for open strokes and sharp joins with a fixed limit and bevel fallback for excessive spikes (AD-031). The exact limit remains open; rounded/configurable styles are deferred.

- Measure stroke width in world units and scale it with the geometry and camera zoom (AD-030). Constant screen thickness is a future option.

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Support filled and outlined simple polygons, including concave polygons, without holes or self-intersections.
- Center strokes on path centerlines and polygon boundaries, with half the width on each side (AD-029). Inside/outside alignment is a [Phase 3 candidate](../../specifications/phase-3-candidates.md).
- Support stroke-only paths with straight segments, quadratic and cubic Bézier curves, and explicit closure.
- Create reusable geometry and draw it repeatedly with explicit transforms/styles. Rebuild when shape data changes.
- Filled curved paths, holes, and fill rules are Phase 3 candidates.

## Scenarios

### Concave marker

A game creates an L-shaped polygon once and draws it at several locations; its concavity stays empty.

### Curved route

A reusable path combines straight and curved segments. Repeated drawing changes its placement without changing the path shape.

## Acceptance criteria

- Verify open strokes stop at their endpoints, rectangle outlines retain square corners, and sufficiently acute joins fall back to bevels. Add boundary fixtures once the miter limit is defined.

- With fixed viewport scaling and display density, verify a width-2 stroke has twice the screen thickness at camera zoom 2 versus zoom 1, allowing the stated rasterization tolerance.

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify straight portions of path and polygon strokes extend half a stroke width to either side of the geometry; verify cap/join behavior using the separate endpoint and corner fixtures.
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
