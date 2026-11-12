# Renderer performance benchmark report

## Status

Initial evidence report. Replace the recorded measurements only with a
repeatable run on the same profile, and keep the environment metadata with the
result.

## Workloads

The benchmark covers 100, 1,000, and 10,000 shared-texture sprites. Each size
has a warm-up period and repeated production-frame samples. The browser lane
also runs one diagnostic-capture sample so readback cost remains a separate
measurement.

## Regression policy

- Timing regression budget: 20% against the matching recorded profile.
- Retained-resource regression budget: 15% where the environment exposes a
  stable measurement.
- Production frames must report zero readbacks.
- Shared-texture workloads must preserve one contiguous compatible batch.
- Missing WebGPU or adapter/device creation is an environment failure.

## Recorded profile

Run `npm run test:benchmark:renderer:browser` with the trusted WebGPU
configuration. The test output and attached `renderer-benchmark.json` record
browser version, OS, adapter metadata, DPR, viewport, fixture dimensions, CPU
preparation time, production frame time, diagnostic frame time, submissions,
batch breaks, and readback counts.

The current repository run is intentionally not treated as a universal FPS
promise. Compare matching browser, OS, GPU, DPR, viewport, and fixture profiles
before enforcing a regression guard.

Current recorded profile (`darwin-chromium-156.0.8078.4`, Apple Metal-3,
DPR 1, 1280×720 viewport, 800×450 fixture):

| Sprites | CPU preparation (ms) | Production frame (ms) | Diagnostic frame (ms) | Submissions | Batch breaks | Production readbacks |
| ------: | -------------------: | --------------------: | --------------------: | ----------: | -----------: | -------------------: |
|     100 |                 0.10 |                  2.50 |                  7.90 |           1 |            0 |                    0 |
|   1,000 |                 0.00 |                  5.20 |                  7.50 |           1 |            0 |                    0 |
|  10,000 |                 0.50 |                 33.60 |                 28.90 |           1 |            0 |                    0 |

## Interpretation

Production timing includes command submission completion but no readback.
Diagnostic timing includes the explicit pixel capture and is expected to be
higher. CPU preparation is measured separately from GPU execution. The
benchmark is evidence for the private renderer implementation, not a public
renderer subsystem contract.
