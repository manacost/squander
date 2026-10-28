# game-lifecycle

## Goal

Create, stop, and dispose a game without leaving partially initialized or abandoned work running.

## Status

Implemented.

## Requirements

- Finish asynchronous setup before update/draw begins.
- On setup failure, release resources acquired by that attempt and expose a typed error. Retry requires a fresh instance.
- An update/draw exception stops the loop and exposes a typed error; retain the instance for inspection and explicit disposal. Never resume automatically.
- Game disposal immediately stops callbacks and signals cancellation; return the same cleanup-completion promise on repeated calls. The application or Svelte host calls it. Do not wait forever for arbitrary non-cooperative user work; safely release late managed resources.
- Disposal is idempotent and wins over in-flight setup/loading. Signal cancellation, cancel where possible, and release late results without starting a loop.

## Scenarios

### Leaving during loading

A host unmounts while setup awaits an asset. Disposal prevents setup completion from starting the game and releases any resource arriving afterward.

### Callback failure

A draw callback throws. The caller receives an identifiable failure and subsequent frames do not invoke game callbacks.

## Acceptance criteria

- Hold setup pending with a controllable promise: no game callbacks occur before success; after disposal, resolving it never starts callbacks.
- Fail setup after one resource acquisition: observe that ownership released and a typed error delivered, with no active loop.
- Throw from update and draw separately: each halts future loop callbacks, leaves explicit disposal available, and preserves the original cause.
- Dispose twice during setup and while running: no duplicate release, active listener, or scheduled game callback survives.

## Usage description

Create a game with asynchronous setup and separate update/draw callbacks. The host presents initialization errors and disposes the instance when its owning view leaves.

## Test references

Current verification:

- [`src/lib/core/runtime/frame_loop.test.ts`](../../src/lib/core/runtime/frame_loop.test.ts)
  covers update-before-draw ordering, callback failure stop, pause/resume,
  visibility suspension, and idempotent disposal in the
  `[game-lifecycle] frame loop` suite.
- [`src/lib/core/runtime/game.test.ts`](../../src/lib/core/runtime/game.test.ts)
  covers setup gating, disposal during setup, initialization errors, and
  runtime errors in the `[game-lifecycle] game setup` suite.

The game controller exposes a synchronous factory with a `ready` promise. Setup
receives an abort signal, renderer, geometry owner, resource owner, and asset
cache; the loop starts only after setup resolves. Browser host disposal is
covered by the Svelte adapter fixture.

## Notes

AD-011, AD-012, and AD-055. User cleanup hooks remain application-owned; scene
automation is outside Phase 2.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
