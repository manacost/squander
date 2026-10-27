# paths-and-polygons

## Goal

Reuse custom geometry for filled polygons and stroked curved paths.

## Status

Draft. Target: Phase 2. CPU polygon/path preparation, stroke geometry, indexed
triangle submission, prepared-stroke submission, polygon fill/outline
submission, and game-scoped geometry ownership are implemented and verified;
owned-geometry renderer submission is implemented and verified; public package
exports remain unimplemented.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Prepared geometry belongs to its creating game and remains valid until explicit release or game disposal. Reject drawing/updating released handles or use through another game; reclaim prior uses safely under AD-038 (AD-039).

- Use flat ends for open strokes and sharp joins with a fixed limit and bevel fallback for excessive spikes (AD-031). The exact limit remains open; rounded/configurable styles are deferred.

- Measure stroke width in world units and scale it with the geometry and camera zoom (AD-030). Constant screen thickness is a future option.

- Use normal source-over alpha blending in draw order, consistently across all primitive types. Selectable blend modes are outside Phase 2 (AD-027).

- Support per-draw `opacity`, defaulting to 1, multiplied by color alpha and applicable texture/glyph alpha or coverage (AD-026). Do not mutate colors or leak opacity into other draws.

- Support filled and outlined simple polygons, including concave polygons, without holes or self-intersections.
- Validate polygon creation and updates: accept either winding, remove consecutive duplicate points and an optional repeated closing point from the snapshot, and reject nonfinite coordinates, self-intersections, fewer than three distinct vertices, or zero area (AD-036). Do not mutate caller input.
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

### Equivalent inputs and invalid updates

A valid polygon draws identically when its point order is reversed or redundant
consecutive/closing points are supplied. An update containing crossing edges or
only collinear vertices throws and leaves the last valid geometry usable.

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

- Verify explicit release and game disposal clean up prepared geometry, released handles reject drawing/updates, and foreign-game use fails. Verify the same source arrays can create independent handles without transferring ownership.

- Verify open strokes stop at their endpoints, rectangle outlines retain square corners, and sufficiently acute joins fall back to bevels. Add boundary fixtures once the miter limit is defined.

- With fixed viewport scaling and display density, verify a width-2 stroke has twice the screen thickness at camera zoom 2 versus zoom 1, allowing the stated rasterization tolerance.

- Verify overlapping translucent draws against independently calculated source-over results, including reversed order and mixed primitive types. Fully transparent draws leave earlier content unchanged.

- Verify omitted opacity equals 1, zero opacity contributes no visible color, and color alpha 0.5 with opacity 0.5 yields effective source alpha 0.25 before coverage. Verify the next draw retains its own default opacity.

- Verify straight portions of path and polygon strokes extend half a stroke width to either side of the geometry; verify cap/join behavior using the separate endpoint and corner fixtures.
- Compare fill/outline output for clockwise and counterclockwise inputs and for equivalent inputs containing consecutive duplicates or a repeated closing point; verify caller arrays and point objects remain unchanged.
- Verify nonfinite coordinates, self-intersections, too few distinct vertices, and zero-area polygons fail at both creation and update. Failed updates preserve the previous rendered output.
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
The current CPU snapshot handles expose this operation as `update`; the final
package-level geometry surface remains unpromoted.

## Test references

The CPU polygon snapshot and validation contract is covered by
[`src/lib/core/runtime/polygons.test.ts`](../../src/lib/core/runtime/polygons.test.ts),
including normalization, caller isolation, valid updates, invalid updates, and
prior-state preservation. Existing legacy tests are not claimed as replacement
framework coverage. The CPU path command snapshot contract is covered by
[`src/lib/core/runtime/paths.test.ts`](../../src/lib/core/runtime/paths.test.ts),
including command isolation, disconnected subpaths, curve values, update
preservation, and sequencing validation. CPU triangulation is covered by
[`src/lib/core/runtime/triangulation.test.ts`](../../src/lib/core/runtime/triangulation.test.ts),
covering concavity, winding normalization, caller isolation, and malformed input:

CPU curve flattening is covered by
[`src/lib/core/runtime/path_flattening.test.ts`](../../src/lib/core/runtime/path_flattening.test.ts),
covering endpoint preservation, disconnected subpaths, closure, and tolerance
validation.

Flat-capped segment geometry is covered by
[`src/lib/core/runtime/stroke_geometry.test.ts`](../../src/lib/core/runtime/stroke_geometry.test.ts),
covering centered width, disconnected subpaths, and zero-length segments.
The same suite covers fixed-ratio miter joins, bevel fallback at excessive
spikes, and the wraparound corner of a closed subpath.
The real WebGPU renderer fixture
[`verification/webgpu-renderer.spec.ts`](../../verification/webgpu-renderer.spec.ts)
covers indexed triangle, prepared-stroke, concave polygon fill, and polygon
outline submission with deterministic readback.
Game-scoped geometry lifecycle is covered by
[`src/lib/core/runtime/geometry_ownership.test.ts`](../../src/lib/core/runtime/geometry_ownership.test.ts)
and the game disposal case in
[`src/lib/core/runtime/game.test.ts`](../../src/lib/core/runtime/game.test.ts).
Owned-handle renderer submission and stale-handle rejection are covered by the
real WebGPU fixture in
[`verification/webgpu-renderer.spec.ts`](../../verification/webgpu-renderer.spec.ts).

Remaining planned verification includes curve endpoint tests, real GPU
concavity/curve fixtures, and geometry reuse checks.

Use `[paths-and-polygons]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-015, AD-033 through AD-036, and AD-039. Open: command sequencing after closure and empty subpaths, exact command shapes and update-operation name, rebuild scheduling, tessellation tolerance under zoom, exact geometry release API, numerical validation tolerances, and overlapping-edge/nonadjacent-touching-vertex behavior.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
