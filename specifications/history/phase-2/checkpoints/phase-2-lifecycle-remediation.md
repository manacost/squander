# Phase 2 lifecycle remediation checkpoint

## Scope

This checkpoint covers the lifecycle-side remediation after the Phase 2 review:

- Browser WebGPU flows moved from `verification/` to `tests/`.
- Pending pause and visibility requests now apply after asynchronous setup.
- The frame loop exposes an internal failure seam for device-loss propagation.
- `GameDeviceLostError` distinguishes device loss from ordinary callback failure.
- Repeated failure and disposal remain idempotent.

## Contract decisions

- Device loss stops the active loop and reports a distinct `GameDeviceLostError`.
- Device loss does not recover automatically; disposal and a fresh game are required.
- The game core accepts a `PromiseLike<unknown>` device-loss notification and remains
  independent of WebGPU types.
- Real renderer/device-loss delivery is not yet claimed by this checkpoint.

## Code trace

`create_game` → asynchronous setup → `create_frame_loop` → pending lifecycle state
application → `device_lost.then` → `FrameLoop.fail` → typed error callback → stopped
state → explicit disposal and owner cleanup.

Browser evidence now traces Playwright WebGPU configuration → trusted local Vite
origin → `tests/webgpu*.spec.ts` → renderer import → adapter/device → deterministic
readback.

## Verification

Commands and outcomes:

- `npm run test:unit -- src/lib/core/runtime/frame_loop.test.ts src/lib/core/runtime/game.test.ts`
  — passed, 16 tests.
- `npm run check` — passed with zero diagnostics.
- Focused lifecycle coverage — passed:
  - Statements: 100%
  - Branches: 97.67%
  - Functions: 100%
  - Lines: 100%
- `npm run test:webgpu` — passed, 26 real Chromium WebGPU tests.
- `npm run test:coverage:runtime` — passed tests, but global replacement-runtime
  coverage remains below the Phase 2 gate because renderer and unrelated runtime
  modules are not yet covered.

## Evidence gaps and go/no-go

The lifecycle slice is ready for continuation. `game-lifecycle` and `game-timing`
kernel changes meet the slice coverage gate. `webgpu-runtime` remains Draft until
controlled real device loss, independent-game GPU isolation, and package-consumer
evidence are added. Proceed to asset/sprite/viewport work only while preserving the
global coverage and real-GPU gates.
