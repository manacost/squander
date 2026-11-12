# renderer-performance

## Goal

Reduce avoidable per-draw WebGPU allocation while preserving visible order,
resource ownership, and the single public `WebGpuRenderer` mechanism.

## Status

Accepted. The private reuse and batching implementation is in place; complete
promotion requires the recorded cold/transition comparison and retained
resource counters.

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
  records warm production and diagnostic timings, submissions, batch breaks,
  and readbacks at the same sizes.
- [`benchmark-report.md`](benchmark-report.md) records the matching browser,
  OS, adapter, DPR, viewport, fixture, warm-up, and sample profile.

The current evidence does not claim a stable retained-resource counter or a
separate cold/transition report. Those remain explicit promotion gaps rather
than hidden skips. Planned verification for those gaps is tracked in A4 of the
local core-evolution ledger.

## Notes

PixiJS guidance is used as performance inspiration: profile first, preserve
batch compatibility and draw order, and measure culling separately for CPU- and
GPU-bound workloads. Mipmaps, swappable projections, and public renderer
subsystems remain outside this capability.
