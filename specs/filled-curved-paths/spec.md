# filled-curved-paths

## Goal

Fill closed flattened curved subpaths, including holes and nested islands,
through one documented even-odd tessellation contract.

## Status

Implemented.

## Requirements

- A `filled_path` render command accepts one or more closed
  `FlattenedSubpath` values, a color, optional opacity, and the `even_odd`
  fill rule.
- Quadratic and cubic curves are flattened before tessellation. Repeated
  closing points and consecutive duplicate points are normalized.
- Even-odd nesting makes alternating rings solid and transparent. A hole does
  not require a particular winding direction.
- Caller point data is not mutated. Invalid, open, degenerate, or
  self-intersecting subpaths fail predictably before GPU submission.
- Tessellated geometry uses the existing renderer-owned indexed geometry path;
  raw GPU resources remain private.
- The contract is stable within rasterization tolerances. Nonzero winding,
  stroke alignment, mipmaps, and swappable projections remain separate
  capabilities.

## Scenarios

### Curved filled region

A game flattens a closed Bézier outline and submits it as a filled path. The
curve endpoints and interior render as one solid region.

### Hole and nested island

An outer region contains a hole and a smaller island. Even-odd nesting renders
the hole transparent and the island solid.

### Invalid path

An open, self-intersecting, zero-area, or nonfinite subpath is rejected before
the renderer creates a GPU buffer.

## Acceptance criteria

- Independent CPU tessellation tests cover curves, holes, nested holes,
  repeated closing points, winding, degeneracy, and self-intersection.
- Trusted WebGPU pixel tests verify a curved filled region and a transparent
  hole with declared readback expectations.
- Geometry ownership and update behavior remain covered by the existing owned
  geometry tests and renderer fixtures.
- Static and dynamic tessellation workloads record preparation behavior without
  making an absolute frame-rate promise.
- Focused documentation and `llms.txt` describe the supported command and
  even-odd boundary.

## Usage description

```ts
const outer = flatten_path([move_to(0, 0), line_to(200, 0), line_to(200, 120), line_to(0, 120), close()], 0.5)[0];
const hole = flatten_path([move_to(40, 30), line_to(40, 90), line_to(160, 90), line_to(160, 30), close()], 0.5)[0];
frame.draw_commands([{ kind: "filled_path", draw: { subpaths: [outer, hole], fill_rule: "even_odd", color: rgba(1, 0, 0, 1) } }]);
```

The renderer owns the indexed upload. The current contract uses closed
flattened subpaths and does not expose a general fill-rule or raw tessellation
plugin interface.

## Test references

- [`src/lib/core/runtime/triangulation.test.ts`](../../src/lib/core/runtime/triangulation.test.ts)
  covers even-odd holes, nested islands, and closed-subpath validation.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  `[paths-and-polygons] fills curved subpaths with an even-odd hole` on trusted
  WebGPU.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers the closed
  `filled_path` command and rejects unsupported fill rules.

## Notes

The tessellator bridges nested rings into simple indexed polygons. It rejects
ambiguous geometry rather than guessing. See [AD-068](../../specifications/decisions.md#AD-068-filled-curved-paths-use-even-odd-subpaths).
