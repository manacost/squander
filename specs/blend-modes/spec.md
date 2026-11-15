# blend-modes

## Goal

Provide explicit, order-preserving blend modes for 2D draws while keeping
pipeline ownership inside the single public `WebGpuRenderer` mechanism.

## Status

Implemented.

## Requirements

- Every texture, shape, geometry, and text draw accepts an optional
  `blend_mode`.
- `normal` is the default and uses source-over alpha composition.
- `additive` adds source color contribution to the destination.
- `multiply` multiplies source color with the destination while preserving the
  destination contribution outside source coverage.
- A blend-mode change is an explicit batch break. Consecutive draws with the
  same texture, sampler, and blend mode may batch while preserving order.
- Unsupported runtime values fail with a clear `RangeError`.
- Blend mode is draw-local and does not mutate colors, textures, or later
  commands.
- Pipeline variants, bind groups, and GPU resources remain renderer-owned and
  are not public subsystems.

## Scenarios

### Additive effect

A particle or glow uses `additive` to brighten a background without requiring
a second renderer or raw WebGPU pipeline.

### Multiply shadow

A shadow or tint uses `multiply` while retaining draw order and ordinary
texture/shape ownership.

### Mixed command order

Normal, additive, and multiply draws appear in the submitted order. A mode
change creates a batch break, while adjacent compatible draws with one mode
remain eligible for batching.

## Acceptance criteria

- Each mode has deterministic trusted-WebGPU pixel evidence against independent
  expected values.
- The default normal mode preserves existing source-over output.
- Mixed primitive and texture draws preserve order across mode changes.
- Unit tests cover validation and blend-mode batch breaks.
- Type tests expose the finite mode union and reject unsupported literals.
- Focused documentation and `llms.txt` describe the supported values and
  limitations.

## Usage description

```ts
frame.draw_commands([
  { kind: "rectangle", draw: { rectangle: glow_bounds, color: glow_color, blend_mode: "additive" } },
  { kind: "texture", draw: { texture: shadow, options: { blend_mode: "multiply" } } },
]);
```

`blend_mode` is intentionally a draw option. Applications do not create or
manage GPU pipelines directly.

## Test references

- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  covers runtime validation and batch breaks.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  normal, additive, and multiply pixel output on a trusted WebGPU device.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers the public
  mode union and rejected misuse.

The focused test tag is `[blend-modes]`.

## Notes

This capability does not add custom shaders, render targets, mipmaps, or
swappable projections. The blend equations are renderer-owned implementation
details behind the three documented modes.
