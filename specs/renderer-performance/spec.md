# renderer-performance

## Goal

Reduce avoidable per-draw WebGPU allocation while preserving visible order,
resource ownership, and the single public `WebGpuRenderer` mechanism.

## Status

Implemented. The private reuse and batching implementation has matching-profile
cold, warm, transition, readback, and retained-resource evidence.

## Requirements

- Cache samplers by the complete filtering policy used by a texture.
- Reuse frame-local upload storage only when in-flight frames cannot observe
  overwritten data; otherwise use a ring or completion-delimited storage.
- Reuse compatible vertex and bind-group structures without changing command
  order or resource validity.
- Break batching for texture changes, blend-mode changes, target changes, and
  explicit order-sensitive commands.
- Keep caches, pools, batchers, and allocation counters private to the renderer.
- Release cached resources with renderer disposal and never destroy a resource
  before its outstanding frame lease is safe.
- Treat CPU preparation, GPU execution, readback, resolution, and batching as
  separate measurements.

## Scenarios

### Repeated filtering policy

Many warm-frame draws use nearest filtering and a smaller number use linear
filtering. The renderer creates one sampler for each policy and reuses them
without changing sampled pixels.

### Compatible sprites

Sprites sharing the same texture, filtering, target, and blend policy are
compatible for internal batching. A texture or order-sensitive change creates a
break, and the result remains pixel-equivalent to the unbatched order.

### In-flight frame reuse

An application submits one frame and immediately records another. Reused upload
storage is not overwritten until the first frame is safe, or the renderer uses
another ring slot.

## Acceptance criteria

- [x] Warm frames do not create one sampler, uniform buffer, bind group, and
      transient vertex buffer per draw.
- [x] Compatible sprite groups produce fewer submissions than the baseline.
- [x] Texture, blend, target, and order changes preserve output.
- [x] Geometry updates replace only affected persistent GPU data.
- [x] Resource release remains safe while work is in flight.
- [x] Cold, warm, and transition measurements are recorded for 100, 1,000,
      and 10,000 sprite workloads.

## Usage description

No new public renderer subsystem is required. Applications continue to record
`RenderCommand` values through `RenderFrame` or use the existing compatibility
methods. The renderer chooses private reuse and batching strategies.

## Test references

Current verification:

- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  covers sampler, upload-buffer, bind-group, draw-call, and geometry reuse
  seams.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts) covers
  real texture, geometry, order, and pixel behavior on the trusted WebGPU
  device.
- [`verification/renderer-benchmark.test.ts`](../../verification/renderer-benchmark.test.ts)
  records CPU preparation at 100, 1,000, and 10,000 sprites.
- [`tests/webgpu-renderer-performance.spec.ts`](../../tests/webgpu-renderer-performance.spec.ts)
  records cold, warm, texture-transition, and diagnostic timings, submissions,
  draw-derived batch breaks, readbacks, and retained WebGPU buffers/textures at
  the same sizes.
- [`verification/webgpu-allocation-instrumentation.ts`](../../verification/webgpu-allocation-instrumentation.ts)
  counts actual device resource creation, submissions, draw calls, readbacks,
  and live buffers/textures without exposing counters through the renderer API.
- [`benchmark-report.md`](benchmark-report.md) records the matching browser,
  OS, adapter, DPR, viewport, fixture, warm-up, and sample profile.

The recorded matching-profile baseline includes a 20% timing guard and a 15%
retained-buffer and texture guard. Warm frames allocate no GPU resources, a
single texture transition creates one new bind group and one batch break, and
all tracked buffers/textures are released on renderer disposal. See the
[benchmark report](benchmark-report.md) for environment and measurements.

## Notes

PixiJS guidance is used as performance inspiration: profile first, preserve
batch compatibility and draw order, and measure culling separately for CPU- and
GPU-bound workloads. Mipmaps, swappable projections, and public renderer
subsystems remain outside this capability.
