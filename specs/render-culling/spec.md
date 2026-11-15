# render-culling

## Goal

Skip clearly offscreen render commands when a caller opts into renderer culling,
while preserving visible output, draw order, and all simulation and input work.

## Status

Implemented.

## Requirements

- `WebGpuRendererOptions.cull_offscreen` enables culling; the default is false.
- A `RenderCommand` may provide world-axis-aligned `bounds`.
- Culling uses the active camera's conservative `is_in_view` predicate. Without
  an active camera, bounded commands remain unchanged.
- A bounded command is skipped only when its bounds are definitely outside the
  camera view. Edge-touching, partially visible, and unbounded commands remain.
- Bounds must include the complete rendered content, including stroke extent.
- Culling applies only to render submission. It never skips simulation, input,
  resource ownership, or command recording.
- The renderer remains one public mechanism; culling counters and helpers are
  internal until measured diagnostics require a public contract.

## Scenarios

### Large-world opt-in

A game enables culling and supplies world bounds for sprites in a camera scope.
Clearly distant sprites do not become GPU draws, while visible sprites retain
their existing order and pixels.

### Conservative boundary

A bound touching the camera edge or overlapping it is submitted. An unbounded
debug command is submitted even when culling is enabled.

### CPU-bound workload

A small scene enables culling but measures CPU command preparation separately.
If bounds checks cost more than they save, the game leaves the option disabled.

### GPU-bound workload

A large scene compares culling off and on with equivalent bounded commands.
The benchmark records skipped draws and GPU timing without treating a single
absolute FPS value as a universal promise.

## Acceptance criteria

- Unit tests verify offscreen, visible, edge-touching, and unbounded behavior
  against independent camera boundary cases.
- Trusted WebGPU tests compare culling on and off and produce identical pixels
  for visible content.
- CPU-bound and GPU-bound benchmark profiles record preparation time, draw
  count, and environment metadata separately.
- A false-negative regression guard fails if a visible or touching bound is
  skipped.
- Type tests cover optional command bounds and the opt-in renderer option.
- Focused documentation and `llms.txt` describe the opt-in workflow.

## Usage description

```ts
const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450, cull_offscreen: true });
camera.draw(() => {
  frame.draw_commands([{ kind: "texture", draw: { texture }, bounds: enemy_bounds }]);
});
```

Bounds are world-space rectangles when used inside a camera scope. They are
conservative hints, not a replacement for gameplay visibility or collision
logic. Culling is disabled by default.

## Test references

- [`src/lib/core/runtime/camera.test.ts`](../../src/lib/core/runtime/camera.test.ts)
  covers the independent conservative visibility predicate.
- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  covers `[render-culling]` command filtering and unbounded preservation.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers optional
  command bounds and the renderer option.
- [`tests/webgpu-renderer-culling-performance.spec.ts`](../../tests/webgpu-renderer-culling-performance.spec.ts)
  records separate CPU visibility work and trusted GPU diagnostic timings for
  100, 1,000, and 10,000 commands. See the [benchmark report](benchmark-report.md).

## Notes

This capability does not provide occlusion culling, camera/world projection
changes, or automatic bounds calculation. See AD-048, AD-049, and AD-050 in the
[decision log](../../specifications/decisions.md).
