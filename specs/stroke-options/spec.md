# stroke-options

## Goal

Give path strokes explicit width units, cap styles, join styles, and miter
limits while preserving world-space behavior as the default.

## Status

Implemented.

## Requirements

- `StrokeDraw` accepts `units: "world" | "screen"`; world units remain the
  default.
- Screen-space width is adjusted for the active camera zoom and renderer
  display density so its physical thickness remains stable across zoom and DPR.
- Open paths support `butt`, `square`, and `round` caps. Butt remains the
  default.
- Corners support `miter`, `bevel`, and `round` joins. Miter remains the
  default and falls back when `miter_limit` is exceeded.
- `miter_limit` is finite and at least one. Invalid options fail before GPU
  submission.
- Closed paths do not add open-end caps. Degenerate segments remain ignored as
  in the existing stroke contract.
- Geometry remains renderer-owned and indexed; no raw GPU resource or pipeline
  is exposed.

## Scenarios

### Constant-width overlay

A selection outline uses screen units and retains its visual thickness while
the camera zooms or the device pixel ratio changes.

### World-space trail

A trail uses the default world units and scales naturally with camera zoom.

### Endpoint and corner styles

A debug path selects round caps and joins, while a map boundary selects a
limited miter or bevel fallback.

## Acceptance criteria

- CPU tests cover all caps, joins, miter-limit validation, degenerate segments,
  and geometry stability.
- Camera zoom and DPR tests verify screen-space thickness against independent
  expected geometry.
- Trusted WebGPU fixtures verify endpoint and corner pixels with declared
  tolerances.
- Dynamic stroke preparation evidence records static and changing path costs.
- Type tests cover units, caps, joins, and rejected option values.
- Focused documentation and `llms.txt` describe supported styles and defaults.

## Usage description

```ts
frame.draw_commands([
  {
    kind: "stroke",
    draw: {
      subpaths: outline,
      width: 2,
      units: "screen",
      cap: "round",
      join: "round",
      color: rgba(1, 1, 0, 1),
    },
  },
]);
```

Only path stroke commands expose the first configurable-stroke contract.
Circle/rectangle outline shader parameters and inside/outside alignment remain
separate decisions.

## Test references

- [stroke-options](../../tests/webgpu-renderer.spec.ts) provides focused GPU
  pixel evidence for the implemented contract.

- [`src/lib/core/runtime/stroke_geometry.test.ts`](../../src/lib/core/runtime/stroke_geometry.test.ts)
  covers caps, joins, width, and miter-limit validation.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  endpoint, corner, and screen-space pixel behavior.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers the public
  stroke command options.
- [`benchmark-report.md`](benchmark-report.md) records static and dynamic
  preparation measurements on the pinned Node environment.

## Notes

The renderer converts screen-space width to world geometry using camera zoom and
display density before tessellation. See [AD-069](../../specifications/decisions.md#AD-069-stroke-width-and-style-options).
