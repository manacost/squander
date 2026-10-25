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
- Construct polygons from ordered point arrays, connecting the last vertex to the first implicitly. No repeated endpoint or `close()` command is required (AD-035).
- Snapshot polygon point values at creation and explicit updates. Return an opaque stable handle; invalid updates throw and preserve previous geometry, just as for paths. Polygon updates happen outside `draw`; the update verb remains open.
- Center strokes on path centerlines and polygon boundaries, with half the width on each side (AD-029). Inside/outside alignment is a [Phase 3 candidate](../../specifications/phase-3-candidates.md).
- Support stroke-only paths with straight segments, quadratic and cubic Bézier curves, and explicit closure.
- Allow multiple disconnected subpaths per handle: `move_to` starts a new section without a connecting segment, and `close()` connects only the current section to its own start. Subpaths share the draw style and transforms (AD-034).
- Create reusable geometry and draw it repeatedly with explicit transforms/styles. Rebuild when shape data changes.
- Construct paths from declarative typed command arrays; snapshot their values at creation. The resulting handle is opaque, not an editable/indexable command array (AD-033).
- Permit explicit path updates using revised commands, snapshotting and validating them before changing active geometry. Invalid updates throw and preserve the previous geometry; successful updates retain the handle identity.
- Update path geometry outside `draw`; use per-draw transforms for ordinary placement changes. The update operation's name remains open.
- Filled curved paths, holes, and fill rules are Phase 3 candidates.

## Scenarios

### Concave marker

A game creates an L-shaped polygon once and draws it at several locations; its concavity stays empty.

### Editing a polygon

A triangle is created from three points with an implicit closing edge. Editing a
source point alone does not change the drawn triangle. Submitting revised points
through the explicit update operation changes the same handle only if validation
succeeds; an invalid update leaves the previous triangle drawable.

### Curved route

A reusable path combines straight and curved segments. Repeated drawing changes its placement without changing the path shape.

### Disconnected sections

A path draws from (0, 0) to (100, 0), then moves to (0, 20) and draws to (100, 20).
The result is two separate lines with no diagonal connector. Closing a later
subpath connects to its own start, not the first subpath's start.

### Editing a route

An application edits its command array after creating a route. Drawing the route
still uses its original snapshot until an explicit update succeeds. An invalid
update throws and the original route remains drawable through the same handle.

## Acceptance criteria

- Verify open strokes stop at their endpoints, rectangle outlines retain square corners, and sufficiently acute joins fall back to bevels. Add boundary fixtures once the miter limit is defined.

- With fixed viewport scaling and display density, verify a width-2 stroke has twice the screen thickness at camera zoom 2 versus zoom 1, allowing the stated rasterization tolerance.

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify straight portions of path and polygon strokes extend half a stroke width to either side of the geometry; verify cap/join behavior using the separate endpoint and corner fixtures.
- Verify a three-point polygon produces a closed triangle for both fill and outline without repeating the first point.
- Verify source array/point mutations cannot change prepared polygon geometry, valid explicit updates preserve handle identity, and invalid updates preserve the previous rendered result. Include type tests rejecting indexed handle assignment.
- Render a concave polygon and test known inside/outside points, including its notch.
- Render quadratic/cubic curves and closure with approved visual tolerances; curves meet specified endpoints.
- Draw one geometry with distinct transforms and styles; neither draw mutates the reusable definition.
- Render separated subpaths and verify both sections appear without a connecting segment. Verify closure targets the current subpath’s start and that draw transforms/styles apply to all sections.
- Verify edits to the source array or its command data do not alter the path after creation or a successful update.
- Verify a valid explicit update changes rendered geometry without changing handle identity, and an invalid update preserves the previous rendered result.
- Include type tests rejecting indexed assignment to the opaque path handle while allowing edits to application-owned command arrays.
- Verify shape changes rebuild geometry while unchanged repeated draws reuse preparation; do not prescribe an exact triangulation algorithm.

## Usage description

Create geometry independently of the draw callback, then submit it with per-draw options. Use polygons for filled custom forms and paths for curved strokes.

Illustrative construction:

```ts
const commands = [move_to(0, 0), line_to(100, 0)];
const route = create_path(commands);
commands[1] = line_to(120, 20); // Does not change route by itself.
```

Illustrative polygon construction:

```ts
const points = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 20, y: 30 },
];
const marker = create_polygon(points);
```

Submit revised commands or polygon points through an explicit update operation outside `draw`.
The operation name is intentionally undecided; `replace` is not an accepted API name.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Triangulation invariants (area/coverage) and curve endpoint tests; real GPU concavity/curve fixtures; geometry reuse checks.

Use `[paths-and-polygons]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-015 and AD-033 through AD-035. Open: command sequencing after closure and empty subpaths, exact command shapes and update-operation name, duplicate/repeated closing vertices, rebuild scheduling, tessellation tolerance under zoom, geometry ownership/disposal, winding rules, and behavior for unsupported/degenerate inputs.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
