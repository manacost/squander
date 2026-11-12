# renderer-performance

## Goal

Reduce avoidable per-draw WebGPU allocation while preserving visible order,
resource ownership, and the single public `WebGpuRenderer` mechanism.

## Status

Accepted.

The first implementation slice begins with private sampler reuse and explicit
allocation evidence. Upload storage, bind-group reuse, compatible sprite
batching, and dynamic-buffer pooling remain promotion work.

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

- [ ] Warm frames do not create one sampler, uniform buffer, bind group, and
      transient vertex buffer per draw.
- [ ] Compatible sprite groups produce fewer submissions than the baseline.
- [ ] Texture, blend, target, and order changes preserve output.
- [ ] Geometry updates replace only affected persistent GPU data.
- [ ] Resource release remains safe while work is in flight.
- [ ] Cold, warm, and transition measurements are recorded for 100, 1,000,
      and 10,000 sprite workloads.

## Usage description

No new public renderer subsystem is required. Applications continue to record
`RenderCommand` values through `RenderFrame` or use the existing compatibility
methods. The renderer chooses private reuse and batching strategies.

## Test references

Implementation tests will be added beside the renderer for cache keys,
allocation counters, invalidation, and ownership. Trusted-origin Chromium tests
will compare sprite and geometry pixels with batching enabled and disabled. The
benchmark report will record browser, OS, GPU, DPR, dimensions, warm-up, sample
count, submissions, batch breaks, allocations, and readbacks.

## Notes

PixiJS guidance is used as performance inspiration: profile first, preserve
batch compatibility and draw order, and measure culling separately for CPU- and
GPU-bound workloads. Mipmaps, swappable projections, and public renderer
subsystems remain outside this capability.
