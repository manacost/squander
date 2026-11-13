# render-frame

## Goal

Provide one production frame boundary for a game instance. Application and
scene drawing records ordered commands into one logical frame; submission
clears once, presents once, and does not read pixels back. Diagnostic capture
is explicit and remains available for verification.

## Status

Implemented.

## Requirements

- `WebGpuRenderer` remains the one public rendering mechanism.
- `begin_frame` creates a frame context owned by the renderer.
- A frame records commands in call order and accepts an empty command list.
- `submit` clears the canvas once at frame start and preserves command order
  across target switches, using one command-buffer submission per logical
  production frame. Multiple render passes may target the canvas and offscreen
  targets within that encoder.
- `submit` performs no readback and resolves only after submitted work is safe
  for frame-owned resource leases to release.
- `capture` is an explicit diagnostic request. It schedules a readback for the
  complete frame's eventual submission and returns a promise for deterministic
  pixels. A caller requests capture before `submit`; normal frames never call
  it.
- A frame can be completed only once. Calls after completion fail clearly.
- Existing `clear`, `draw_texture`, `draw_textures`, `draw_text`, and
  `draw_commands` methods remain readback-oriented compatibility methods during
  migration.
- `Game` passes one frame context to the application draw callback and scene
  draw callbacks, in application-then-scene order.
- Frame submission failures are observable by the game lifecycle and do not
  become unhandled promise rejections.

## Scenarios

### Ordered application and scene composition

The application records a background and the scene records a foreground. The
foreground is visible over the background. Reversing the calls reverses the
result.

### Empty production frame

The game has no application or scene commands. The frame still clears and
submits a valid presentation without throwing or reading back.

### Diagnostic capture

An integration test records a known command set and calls `capture`. The
returned bytes are compared with independent expected pixels and declared
tolerances.

### In-flight disposal

The application releases a texture handle while a frame is submitted. The
frame lease keeps the GPU texture alive until accepted work completes, and
game disposal waits for the frame cleanup.

## Acceptance criteria

- [x] Application and scenes render in bottom-to-top order.
- [x] Multiple draw groups preserve order and alpha composition.
- [x] A production frame uses one command-buffer submission across target
      switches.
- [x] A production frame performs zero readbacks.
- [x] Diagnostic capture returns deterministic pixels.
- [x] Existing readback APIs continue working during migration.
- [x] Disposal cannot destroy resources before submitted work releases its
      leases.

## Evidence map

- Unit: frame state, command ordering, clear policy, empty frames, and
  completion errors.
- Type: frame callback inference and rejected use after completion.
- Browser/WebGPU: trusted-origin Chromium with secure-context, adapter, and
  device assertions; layered pixel fixture and diagnostic capture.
- Lifecycle: fake renderer submission rejection and disposal during an
  in-flight frame.
- Coverage: focused runtime coverage remains separate from real GPU evidence.

## Usage description

The game and scene draw callbacks receive a `RenderFrame`. Record commands in
the callback and let the runtime submit the frame:

```ts
draw: (frame) => {
  frame.draw_commands([{ kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 800, height: 450 }, color: rgba(0, 0, 0, 1) } }]);
};
```

For lower-level rendering, call `renderer.begin_frame()`, record commands, and
call `submit()`. Call `capture()` before `submit()` only when a diagnostic
readback is required.

## Test references

Current CPU verification:

- [`src/lib/core/runtime/game.test.ts`](../../src/lib/core/runtime/game.test.ts)
  verifies application and scene command order and one frame submission in the
  `[game-lifecycle] game setup` suite.
- [`src/lib/core/runtime/webgpu_renderer.test.ts`](../../src/lib/core/runtime/webgpu_renderer.test.ts)
  verifies no readback for production submission, explicit capture requests,
  empty frames, and completion errors in the `[webgpu-runtime] renderer CPU
orchestration` suite.
- [`src/lib/core/runtime/frame_loop.test.ts`](../../src/lib/core/runtime/frame_loop.test.ts)
  verifies asynchronous draw rejection is reported without an unhandled
  rejection.

Trusted-origin layered WebGPU verification passes in
[`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts), including
ordered layer readback and explicit diagnostic capture.

The target-switch benchmark in
[`benchmark-report.md`](benchmark-report.md) verifies one command-buffer
submission for one, two, four, and eight render passes. In the recorded profile,
the eight-pass workload improved from 3.9 ms to 1.0 ms. Absolute timings remain
informational and profile-specific; the structural submission gate is enforced.

## Notes

AD-063 establishes the frame boundary without splitting the renderer into
public subsystems. Mipmaps and swappable projections remain outside this
capability. The diagnostic capture request is intentionally opt-in so normal
frames have no readback cost.

## Public contract questions resolved for A1

- The normal game callback receives a frame context rather than a raw encoder
  or GPU object.
- The frame context records high-level `RenderCommand` values, preserving the
  existing renderer command vocabulary.
- Raw WebGPU resources, encoders, passes, and views remain private.
- Projection selection and mipmap policy are not part of this capability.

See AD-063 in the [decision log](../../specifications/decisions.md) and the
[implementation readiness guidance](../../specifications/implementation-readiness.md).
