# custom-shader-effects

## Goal

Apply a constrained fragment effect to a texture or renderer-owned render
target without exposing raw WebGPU objects, bindings, or pipeline ownership.

## Status

Implemented.

## Requirements

- `renderer.create_shader_effect({ fragment_code, uniforms })` returns an
  opaque `WebGpuShaderEffect`.
- `TextureDrawOptions.effect` accepts an effect for texture and render-target
  draws. Effects do not change vertex placement or camera transforms.
- The fragment body receives `color: vec4f`, normalized `uv: vec2f`, and
  `uniforms: array<vec4f, 4>`. The body must return a `vec4f` value.
- `uniforms` contains at most 16 finite numbers and is zero-filled when omitted.
- The body is nonempty, at most 4,096 characters, and cannot declare WGSL
  module items or raw GPU bindings and resources.
- Squander owns the sampled texture, sampler, uniform buffer, bind group,
  pipeline variants, and effect disposal.
- Invalid metadata fails synchronously. Shader compilation or pipeline
  validation failures reject the draw or frame submission and use the normal
  game runtime error path.
- A released effect cannot be used by a new draw. Applications release effects
  after accepted work has completed.

## Scenarios

### Uniform-driven color effect

A game creates one effect with a brightness uniform and applies it to a sprite.
The output changes while the game remains unaware of bind groups and pipelines.

### Offscreen postprocessing

A game renders to a renderer-owned target, samples that target with an effect,
and presents the transformed result to the canvas.

### Invalid effect metadata

An application supplies an empty body, a module declaration, a binding, or a
non-finite uniform. Creation fails before any draw is accepted.

### Shader compilation failure

A syntactically invalid but metadata-valid body fails during pipeline creation.
The renderer rejects the draw; the game lifecycle reports the original cause as
its normal runtime error.

## Acceptance criteria

- CPU tests cover metadata limits, rejected declarations, uniform values, and
  renderer ownership.
- Type tests expose the effect and texture-draw types and reject invalid
  uniform values.
- A trusted Chromium WebGPU fixture samples a texture, applies a
  uniform-driven effect, and compares deterministic pixels.
- Effects use Squander-owned pipelines, bindings, and buffers; no raw GPU
  object is exposed in the public API.
- Focused documentation and `llms.txt` describe the supported workflow and
  boundaries.
- Runtime coverage remains a CPU gate; shader behavior is proven separately by
  the real-device fixture.

## Usage description

```ts
const effect = renderer.create_shader_effect({
  fragment_code: "return vec4f(color.rgb * uniforms[0].x, color.a);",
  uniforms: [0.75],
});
await renderer.draw_texture(texture, { effect });
effect.release();
```

The contract does not provide custom vertex shaders, storage textures,
arbitrary bind groups, user-created pipelines, mipmaps, swappable projections,
or a WebGL fallback. Its validation rules constrain the API shape; they are not
a security boundary for untrusted shader source.

## Test references

- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  covers validation, uniform setup, renderer ownership, and released effects.
- [`type-tests/rendering.ts`](../../type-tests/rendering.ts) covers the public
  effect and texture-draw types.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  `[custom-shader-effects]` with trusted WebGPU pixel readback.

## Notes

The fixed layout deliberately supports fragment-only texture effects first.
Broader shader layouts, arbitrary bindings, and an explicit policy for
untrusted shader source remain future questions. See [AD-066](../../specifications/decisions.md#AD-066-custom-effects-use-a-constrained-fragment-body-contract).
