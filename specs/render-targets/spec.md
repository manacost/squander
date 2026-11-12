# render-targets

## Goal

Render into renderer-owned offscreen targets and sample those targets later in
the same logical frame without exposing raw GPU textures or views.

## Status

Implemented.

## Requirements

- `create_render_target` accepts positive integer dimensions and optional
  nearest/linear filtering policy.
- `RenderFrame.set_target(target)` selects an offscreen target; calling it with
  no target selects the canvas presentation surface.
- A target may be used as a texture source in a later command group.
- Target changes preserve command order. The first pass for each target clears;
  later passes load the existing target contents.
- Target handles are renderer-owned and release through the same resource lease
  policy as textures. A frame retains its target lease through submission even
  if the application releases its handle earlier.
- Resize affects the canvas viewport only. Targets retain explicit dimensions
  until released and recreated.
- Target views, formats, pipelines, and bind groups remain private renderer
  details.

## Scenarios

### Offscreen composition

A game renders a scene into a target, switches back to the canvas, and draws
the target as a texture for a UI or screen effect.

### Released target after acceptance

An application releases a target handle after recording a frame. The accepted
frame still renders because the frame owns a lease until submission completes.

### Isolated games

Two renderers create same-sized targets. Neither renderer can select or sample
the other's target, and disposing one does not affect the other.

## Acceptance criteria

- A real WebGPU fixture renders offscreen content and composites it to the
  canvas with deterministic pixels.
- Target switching preserves order and clear/load behavior.
- Target release before frame submission does not invalidate an accepted frame.
- Invalid dimensions and foreign targets fail clearly.
- Unit tests cover target ownership, frame selection, and disposal behavior.
- Type tests expose the target handle and reject unrelated source shapes.
- Focused documentation and `llms.txt` describe the supported workflow.

## Usage description

```ts
const target = renderer.create_render_target({ width: 800, height: 450, filtering: { filter: "linear" } });
const frame = renderer.begin_frame();
frame.set_target(target);
frame.draw_commands(scene_commands);
frame.set_target();
frame.draw_commands([{ kind: "texture", draw: { texture: target } }]);
target.release();
await frame.submit();
```

The target is a renderer-owned handle. Applications do not create views,
encoders, or pipelines for it.

## Test references

- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  covers target creation, frame selection, target sampling, validation, and
  release-before-submit ownership.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  `[render-targets]` offscreen rendering and deterministic compositing on a
  trusted WebGPU device.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers the public
  target and texture-source types.

## Notes

Targets use the renderer's preferred canvas format. Mipmaps, multisampling,
arbitrary formats, render-target pooling, and custom postprocessing shaders are
separate capabilities.
