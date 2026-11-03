# Phase 3-b: input routing and device state

## Purpose

Phase 3-b adds browser input to the Phase 3-a composition stack. It covers
keyboard, pointer/mouse, and connected gamepad input, while keeping device
normalization and event ownership in the core runtime. It does not introduce
action maps, rebinding, text-input composition, touch gestures, or a general
UI widget system.

The first implementation slice is the input event router. The second slice
connects that router to game and scene ownership. Browser listeners, device
state, and gamepad polling build on this contract in later slices.

## Goals

- Let the top-most mounted scene claim an input event before lower scenes.
- Let global handlers observe or handle events that no scene consumes.
- Make consumption explicit and deterministic.
- Preserve browser defaults unless the handler that consumes an event asks to
  prevent them.
- Keep the core independent of Svelte and DOM types where possible.
- Keep input ownership isolated per game instance.

## Scope

Included:

1. Keyboard key down/up events and held-key state.
2. Pointer/mouse movement, buttons, cancellation, and wheel data.
3. Connected gamepad discovery, button state, and axis state.
4. Scene-first routing and global fallback handlers.
5. Browser focus, default-action, and pointer-capture policy at the adapter
   seam.

Excluded from this phase:

- action mapping and rebinding;
- text editing, IME composition, and character-input APIs;
- touch-specific gestures and gesture recognition;
- automatic focus traversal or replacement of browser accessibility behavior;
- pointer hit testing against renderables;
- a global input singleton.

## Routing contract

The router receives normalized input events and dispatches them in this order:

```text
top-most mounted scene -> ... -> bottom mounted scene -> global handlers
```

Dispatch stops at the first handler that consumes the event. A handler returns
an explicit disposition rather than relying on a side effect:

- `pass`: continue routing;
- `consume`: stop routing but preserve the browser default;
- `consume_and_prevent_default`: stop routing and request cancellation of the
  matching browser default action.

Global handlers are fallback handlers by default. An explicitly documented
global `capture` mode may run before scenes for system-level behavior, but it
is not the default and cannot silently bypass scene ownership.

Scene input is lifecycle-scoped. Removing a scene removes its handlers before
the next event. A scene can use the same subscription lifetime as its signals
and assets.

## Browser policy

The browser remains the authority for native controls unless the game input
contract says otherwise:

- The adapter listens at the game host seam, not on `window` by default.
- Events whose target is outside the game host are ignored by game-local
  routing.
- Editable controls (`input`, `textarea`, `select`, and contenteditable
  elements) retain keyboard behavior unless a handler explicitly opts into
  system capture.
- Events targeted at game-owned DOM overlays enter the same scene-first router.
- A consumed Space or Enter event must request `preventDefault` when the scene
  intends to stop the browser from activating the focused button.
- Escape may be handled by a scene overlay, allowing a submenu scene to pop
  itself before a global pause/menu handler runs.
- Pointer drag ownership uses the standard DOM `setPointerCapture` seam; the
  core receives normalized move/up/cancel events without depending on DOM APIs.

This makes browser focus visible in the contract rather than treating every
keydown as gameplay input. Native focus is not forcibly stolen on every game
event; a game may explicitly focus its host when it needs keyboard capture.

## Planned slices

1. Core normalized event types, dispositions, and scene-first router.
2. Game-owned router and automatic scene lifecycle integration.
3. Browser keyboard and pointer adapter with focus/default-action policy.
4. Gamepad adapter and per-game device state snapshots.
5. Focused docs and browser evidence for the complete capability.

Each slice requires focused unit tests, public type tests, documentation, and
browser evidence where DOM behavior is part of the claim.

## Browser adapter seam

The browser adapter is explicit rather than implicit:

```ts
const input_adapter = create_browser_input_adapter({ host, router: game.input });
```

The adapter owns DOM listeners and can be disposed independently. The core
game does not access `window` or `document`, which preserves SSR safety and
allows non-browser adapters later.
