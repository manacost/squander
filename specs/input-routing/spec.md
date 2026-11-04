# input-routing

## Goal

Route normalized keyboard, pointer, and gamepad events through the mounted
scene stack before global fallback handlers, while keeping browser default
behavior explicit.

## Status

Implemented. Target phase: Phase 3-b.

## Requirements

- Expose raw-device event types without importing DOM types into the core.
- Dispatch newest mounted scene first, then global fallback handlers.
- Make event consumption and browser default prevention separate outcomes.
- Scope subscriptions and state to one game instance.
- Register and remove scene handlers automatically with scene activation and teardown.
- Provide an explicit DOM adapter that listens only on a caller-owned host.
- Provide a per-game gamepad adapter with immutable snapshots and frame-driven polling.
- Leave action mapping, rebinding, text input, gestures, and renderable hit
  testing for later capabilities.

## Scenarios

### Overlay handles Escape

A submenu scene consumes Escape, so the global pause/menu handler does not run.

### Unclaimed Space reaches a global handler

A scene passes Space and a global handler consumes it while requesting browser
default prevention.

### Scene removal during dispatch

A scene removes another scene while handling an event. The current dispatch
uses a stable snapshot; the removal takes effect for the next event.

### Scene lifecycle owns input

Mounting a scene activates its input handler, replacing or removing a scene
removes the old handler, and disposing the game makes the router inert.

### Browser host preserves native controls

The browser adapter routes keyboard and pointer events from the host subtree,
leaves editable controls alone by default, and only calls `preventDefault()`
for `consume_and_prevent_default`.

### Gamepad state is sampled per frame

The gamepad adapter listens for connection lifecycle events and samples current
button and axis values when its owner calls `poll()`. It emits changes through
the same router and exposes immutable snapshots for polling-based gameplay.

## Interface contract

The core input module will expose normalized device events without importing
DOM types. Its public seam will provide:

- a discriminated `InputEvent` union for keyboard, pointer, and gamepad events;
- an `InputDisposition` union for pass, consume, and consume-plus-default
  prevention;
- scene-scoped subscriptions and global fallback subscriptions;
- deterministic newest-scene-first dispatch;
- idempotent unsubscribe and disposal.

The initial slice deliberately does not expose action names or bindings. Those
belong to a later action-mapping capability and must not leak into raw-device
routing.

## Acceptance criteria

- A newer scene receives an event before an older scene.
- A consuming scene prevents lower scenes and fallback handlers from receiving
  the event.
- A passing scene allows the next scene and then global fallback handlers to
  receive it.
- A global handler can consume an otherwise unclaimed event.
- Subscription removal during dispatch takes effect for the next callback and
  does not corrupt the current dispatch order.
- Disposal removes all handlers and makes later dispatch a no-op.
- Multiple game/input instances do not share handlers or state.
- Public type tests accept valid event narrowing and reject invalid device
  payloads or unsupported action-map assumptions.

## Usage description

Create one router per game, register scene handlers as scenes mount, register
global fallback handlers for cross-scene behavior, and return an explicit
disposition from each handler. In a browser, attach the host adapter explicitly:

```ts
const input_adapter = create_browser_input_adapter({ host, router: game.input });
```

Dispose the adapter with the host or game lifecycle.

## Test references

Planned verification:

- [`src/lib/core/runtime/input.test.ts`](../../src/lib/core/runtime/input.test.ts)
  covers scene ordering, fallback dispatch, capture handlers, stable mutation,
  removal, and disposal.
- [`type-tests/input.ts`](../../type-tests/input.ts) covers event narrowing and
  rejected event/disposition misuse.
- [`src/lib/core/runtime/browser_input.test.ts`](../../src/lib/core/runtime/browser_input.test.ts)
  covers host keyboard/pointer normalization, editable-control policy,
  default prevention, pointer capture, focus, and listener disposal.
- [`src/lib/core/runtime/browser_gamepad.test.ts`](../../src/lib/core/runtime/browser_gamepad.test.ts)
  covers connection/disconnection, changed button and axis events, immutable
  snapshots, polling, and adapter disposal.
- [`tests/input-routing.spec.ts`](../../tests/input-routing.spec.ts) exercises
  the built site in Chromium with a real host DOM, native button activation,
  Escape consumption, and editable text behavior.

## Notes

The core router, game/scene ownership, browser keyboard/pointer adapter,
gamepad adapter, focused documentation, and Chromium host evidence are
implemented. Physical gamepad hardware is environment-dependent and is not
claimed by the automated browser fixture.

## Trace

`Game.scenes` -> input owner -> normalized event router -> scene-scoped
subscriptions -> global fallback -> unit/type tests -> focused documentation.

## Framework comparison rationale

- Godot demonstrates the value of explicit handled/unhandled propagation and
  GUI-before-gameplay semantics. The router adopts the propagation idea while
  replacing node-tree traversal with the existing scene stack.
- Phaser demonstrates a practical unified keyboard/pointer/gamepad surface and
  scene-local access. The router keeps the unified device vocabulary but makes
  ownership and default-action policy explicit.
- Unity demonstrates the leverage of action maps, UI maps, and device
  abstraction. Action maps are intentionally deferred so raw routing can be
  proven independently first.
- Pixi demonstrates DOM-like pointer capture and bubbling for display objects.
  This project keeps pointer hit testing separate from input ownership so the
  core remains useful for non-rendering scene logic.
