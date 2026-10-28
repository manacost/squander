# Phase 2 renderer device-loss checkpoint

## Scope

- Exposed the production renderer's `GPUDevice.lost` promise as an optional
  observation seam on `WebGpuRenderer`.
- Connected `create_game` to renderer loss when no explicit loss promise is
  supplied, preserving the existing explicit override for deterministic tests.
- Suppressed teardown loss after game disposal so normal renderer destruction is
  not reported as runtime failure.

## Code trace

`create_webgpu_renderer` → `device.lost` → `create_game` loss observer →
`FrameLoop.fail` → `GameDeviceLostError` and `on_error`; disposal sets the
 lifecycle disposed flag before renderer teardown, so the same promise cannot
 report a teardown failure.

## Verification

- `npm run test:unit -- src/lib/core/runtime/game.test.ts` — passed, 15 tests.
- The public game test resolves the renderer-owned loss promise and verifies a
  stopped loop with `GameDeviceLostError`; it then disposes the game and verifies
  no second error is reported.
- `npm run test:type` — passed.
- `npm run check` — passed with zero Svelte diagnostics.

## Evidence gaps

The unexpected-loss transition is covered with an injected renderer promise;
forcing an unexpected loss on the pinned Chromium adapter remains environment-
dependent and is not claimed here. Renderer browser coverage remains separate
from TypeScript coverage.

## Go/no-go

**Continue.** Production device-loss observation and teardown suppression are
wired and unit-verified. Proceed to the next lifecycle or adapter slice.
