# Phase 4 PR-readiness remediation checkpoint

Status: **review gaps closed; plan remains in progress at the Phase D roadmap gate**.

Date: 2026-11-14

## Scope

This checkpoint closes the review follow-ups recorded in the local core-evolution
ledger. It does not promote new Phase D work. Mipmaps and swappable projections
remain deferred.

## Findings closed

- **Multiple even-odd holes:** Added a public `triangulate_subpaths` regression
  with independently calculated area 83 for both hole orders. Ear clipping now
  rejects points on an ear boundary while excluding duplicate bridge vertices.
  A real GPU fixture confirms both holes and the exterior remain transparent.
- **Callable thenables:** Added one shared `is_promise_like` guard used by game
  drawing and the frame loop. A callable `PromiseLike<void>` regression proves
  scene drawing and frame submission wait for it to resolve.
- **WebGPU preflight:** The reviewed frame and stroke fixtures assert a secure
  context, `navigator.gpu`, adapter creation, and device creation before
  rendering.
- **Viewport input:** Added a trusted-browser fixed-fit fixture that verifies
  raw CSS coordinates, mapped logical coordinates, and outside-content
  letterbox input.
- **Renderer performance evidence:** Added verification-only WebGPU resource
  instrumentation. The benchmark now reports cold, warm, transition, and
  diagnostic timings; created resources; retained buffers and textures;
  submissions; batch breaks; and readbacks for 100, 1,000, and 10,000 sprites.
  The matching-profile 20% timing and 15% retained-resource guards pass.
- **Coverage policy:** AD-018 now requires greater than 90% statements,
  branches, functions, and lines for executable `src/lib/core/**/*.ts`. The
  strict gate covers 36 files and passes. Svelte lifecycle and docs
  presentation use browser behavior gates rather than a source percentage;
  the whole-source aggregate remains descriptive and is not a promotion gate.
- **Promotion and submission decisions:** A4 cold/transition/retained evidence
  is complete and the renderer-performance spec is Implemented. AD-063 keeps
  one logical frame as the contract and treats one command buffer as an
  internal, benchmark-backed performance target rather than a correctness
  guarantee. The renderer remains one public Squander mechanism.
- **Stale evidence:** The text guide browser assertion now checks the current
  `frame.draw_commands()` example. The earlier full-suite WebGPU dynamic-import
  blocker is closed.

## Verification

- `npm run test:unit` — 40 files, 296 tests passed.
- `npm run test:type` — passed.
- `npm run check` — passed with zero errors and warnings.
- `npm run lint` — passed.
- `npm run validate:specs`, `npm run validate:docs`, and
  `npm run validate:package` — passed.
- `npm run test:coverage` — 296 tests passed. Core aggregate: 96.51%
  statements, 91.95% branches, 99.04% functions, and 99.25% lines.
- `npm run check:coverage` — all 36 core TypeScript files exceed 90% on all
  four metrics.
- `npm run test:integration` — 21 browser tests passed, including the fixed-fit
  pointer fixture.
- `npm run test:webgpu` — 66 real Chromium WebGPU tests passed. The suite
  asserts its actual GPU environment and includes frame, path, lifecycle, and
  pixel fixtures.
- `npm run test:benchmark:renderer:browser:guard` — passed on Chromium
  156.0.8078.4 / macOS / Apple Metal-3 / DPR 1 / 1280×720. Warm frames created
  zero GPU resources and production frames performed zero readbacks at all
  three sprite counts. All tracked buffers and textures were released on
  disposal.
- Target-switch benchmark — one command buffer for 1, 2, 4, and 8 render passes;
  latest medians were 0.6, 0.7, 0.8, and 1.2 ms. The historical matching setup
  measured 3.9 ms at eight passes before the shared-encoder change. This is a
  relative performance observation, not a correctness promise or absolute
  latency threshold.
- `npm run build` — passed, including package generation and Publint.

## Remaining observations

The whole-repository source coverage aggregate is 90.46% statements, 88.01%
branches, 90.69% functions, and 92.21% lines because it includes Svelte and
documentation presentation files. The accepted AD-018 policy gates core
TypeScript and separately exercises those UI behaviors in browser tests.

The development-server scene-UI browser case emits a Svelte hydration warning
while still passing. The focused route flow reproduces the warning; the static
preview integration suite does not. This warning is outside the reviewed gaps
and is recorded for separate diagnosis rather than counted as a passing
assertion or hidden as a skip.

## Commits

| Slice                | Commit    | Change                                                                        |
| -------------------- | --------- | ----------------------------------------------------------------------------- |
| C5 correctness       | `c4b10b3` | Corrected multiple even-odd holes and added CPU/GPU regressions.              |
| Callable thenables   | `f1a7b67` | Shared the PromiseLike guard across game and frame-loop draw paths.           |
| Fixed-fit input      | `05e1b31` | Added the browser fixture and letterbox coordinate checks.                    |
| A4 renderer evidence | `2bdbee8` | Added allocation/retention instrumentation and target-switch measurements.    |
| Coverage and spec    | `4b0049b` | Set the coverage scope, filled core test gaps, and updated verification docs. |

This checkpoint records evidence; it does not replace commit history or test
reports.
