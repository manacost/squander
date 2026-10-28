# Phase 2 replacement-runtime coverage checkpoint

Status: **Replacement runtime CPU coverage gate verified; GPU correctness remains a separate real-device gate**.

## Contract

- The replacement runtime retains the strict greater-than-90% threshold for
  statements, branches, functions, and lines.
- CPU coverage uses public runtime entrypoints with deterministic Canvas,
  FontFace, resource-owner, and fake-WebGPU fixtures.
- Fake WebGPU objects cover renderer orchestration, resource leases, validation,
  command dispatch, readback setup, resize, and disposal. They do not claim
  shader, sampling, blending, tessellation, or pixel correctness.
- Real Chromium WebGPU tests remain the authority for GPU behavior and
  deterministic readback.

## Evidence

`npm run test:coverage:runtime` passed with 27 test files and 126 tests. The
included replacement runtime report contains 22 files and passed
`npm run check:coverage`:

| Metric     |             Result |
| ---------- | -----------------: |
| Statements | 97.57% (1446/1482) |
| Branches   |   95.90% (679/708) |
| Functions  |   98.46% (256/260) |
| Lines      | 98.38% (1339/1361) |

The renderer-specific result was:

| File                                      | Statements | Branches | Functions |  Lines |
| ----------------------------------------- | ---------: | -------: | --------: | -----: |
| `src/lib/core/runtime/webgpu_renderer.ts` |     93.47% |   95.55% |    95.65% | 94.38% |

Focused and complementary evidence:

- `npm run test:unit`: passed, 27 files and 126 tests.
- `npm run test:webgpu`: real Chromium WebGPU readback suite remains required
  for shader, sampling, blending, tessellation, and draw-order correctness.

## Code trace

Public runtime helpers and factories → focused Vitest tests → V8 runtime
coverage report → `verification/assert-coverage.mjs` → strict four-metric gate.

`create_webgpu_renderer` → fake adapter/device/context → texture, geometry,
command, readback, resize, and disposal paths in
`src/lib/core/runtime/webgpu_renderer.test.ts`.

`create_webgpu_font` → deterministic `FontFace`/Canvas 2D fixture → atlas
preparation, glyph reuse, capacity, and release tests in
`src/lib/core/runtime/font_loading.test.ts`.

## Promotion decision

The replacement-runtime coverage gate is complete. Capability promotion still
requires each capability checkpoint's remaining public-contract and real-GPU
acceptance evidence; coverage alone does not promote Draft capabilities.
