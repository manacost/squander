# Renderer performance benchmark report

## Status

Initial evidence report. Replace the recorded measurements only with a
repeatable run on the same profile, and keep the environment metadata with the
result.

## Workloads

The benchmark covers 100, 1,000, and 10,000 shared-texture sprites. Each size
uses a fresh renderer and records its first cold frame, repeated warm frames, a
texture-transition frame, and a diagnostic-capture frame. The transition
workload switches textures once, creating one intentional batch break.

## Regression policy

- Timing regression budget: 20% against the matching recorded profile.
- Retained-resource regression budget: 15% where the environment exposes a
  stable measurement.
- Production frames must report zero readbacks.
- Shared-texture workloads must preserve one contiguous compatible batch.
- Warm frames must allocate no additional GPU resources.
- Transition frames must reuse vertex storage while creating only resources
  needed for the new texture binding.
- Renderer disposal must release all tracked buffers and textures.
- Missing WebGPU or adapter/device creation is an environment failure.

## Recorded profile

Run `npm run test:benchmark:renderer:browser` with the trusted WebGPU
configuration. The test output and attached `renderer-benchmark.json` record
browser version, OS, adapter metadata, DPR, viewport, fixture dimensions, CPU
preparation, cold/warm/transition/diagnostic timing, created GPU resource
counts, retained buffer and texture counts, submissions, draw-derived batch
breaks, and readback counts.

The current repository run is intentionally not treated as a universal FPS
promise. Compare matching browser, OS, GPU, DPR, viewport, and fixture profiles
before enforcing a regression guard.

Current recorded profile (`darwin-chromium-156.0.8078.4`, Apple Metal-3,
DPR 1, 1280×720 viewport, 800×450 fixture):

| Sprites | CPU prep (ms) | Cold (ms) | Warm median (ms) | Transition median (ms) | Diagnostic (ms) | Warm GPU allocations | Transition GPU allocations | Transition batch breaks | Production readbacks |
| ------: | ------------: | --------: | ---------------: | ---------------------: | --------------: | -------------------: | -------------------------: | ----------------------: | -------------------: |
|     100 |           0.0 |       9.8 |              1.7 |                    1.5 |             5.4 |                    0 |                          1 |                       1 |                    0 |
|   1,000 |           0.0 |      10.1 |              3.6 |                    4.1 |             6.3 |                    0 |                          1 |                       1 |                    0 |
|  10,000 |           0.3 |      30.7 |             26.5 |                   28.4 |            24.5 |                    0 |                          1 |                       1 |                    0 |

Tracked retained resources:

| Sprites | Warm buffers | Warm buffer bytes | Warm textures | Buffers after disposal | Buffer bytes after disposal | Textures after disposal |
| ------: | -----------: | ----------------: | ------------: | ---------------------: | --------------------------: | ----------------------: |
|     100 |            2 |            32,832 |             2 |                      0 |                           0 |                       0 |
|   1,000 |            2 |           524,352 |             2 |                      0 |                           0 |                       0 |
|  10,000 |            2 |         4,194,368 |             2 |                      0 |                           0 |                       0 |

## Interpretation

Cold timing includes first-frame resource creation; warm timing measures three
repeated production frames after warm-up. Transition timing follows one texture
switch, which adds one bind group and one batch break without allocating a new
vertex buffer. Warm buffer/resource allocations are zero at all three sizes,
and tracked buffers/textures reach zero after disposal. Production timing
includes submission completion but no readback. Diagnostic timing includes
explicit pixel capture. CPU preparation remains a separate measurement. These
are matching-profile observations, not a public renderer subsystem contract
or an absolute frame-rate promise.
