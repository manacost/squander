# scene-signals

## Status

Implemented. Target phase: Phase 3-a, Slice 3. Typed dispatch, listener
mutation, error routing, scoped cleanup, disposal, and trusted-origin browser
evidence are verified.

## Goal

Provide a game-owned typed event bus shared by scene contexts without a global
mutable singleton or a Svelte dependency.

## Requirements

- Keep the bus owned by one game composition.
- Provide standalone `Signal<T>` and `EventDispatcher<EventMap>` utilities from
  the `squander/signals` package entrypoint.
- Make listener errors observable through the parent game's error path.

## Scenarios

### Two scenes communicate

Two scene contexts use the shared game bus to publish and receive a typed
payload without importing a global singleton.

### Listener mutation

A listener removes itself and adds another listener during dispatch. The active
emission uses a stable snapshot and the next emission observes the mutation.

### Game disposal

Disposing the game clears the bus and prevents later delivery.

## Acceptance criteria

- Event names and payloads are inferred from the declared event map.
- Ordering, `once`, explicit unsubscription, mutation, errors, and disposal are
  tested through the public bus.
- Public exports and type tests reject unknown names and malformed payloads.
- Focused documentation and browser evidence describe the supported scope.

## Contract

- `Game<Manifest, EventMap>.scenes.events` is the explicit parent composition
  bus, and the same bus is available as `context.events` to mounted scenes.
- Event names and payloads are inferred from the declared `EventMap`.
- `on`, `once`, and explicit unsubscription are idempotent and preserve listener
  registration order.
- Dispatch uses a stable listener snapshot. Listeners added during dispatch run
  on the next emission; removed listeners do not run after removal.
- Listener failures are reported through the game runtime error path and do not
  prevent later listeners from running.
- `clear()` disposes the bus. Later emissions and subscriptions have no effect.
- `Signal<T>` and `EventDispatcher<EventMap>` are available as independent
  lower-level primitives from `squander/signals`. They are not game-scoped and
  do not perform runtime error routing or disposal ownership.

## Traceability

`Game.scenes.events` -> `SceneFactoryContext.events` -> `SceneEventBus` ->
listener registration/dispatch -> game disposal -> scene unit/type tests.

## Usage description

```ts
type Events = { score: { points: number } };
const game = create_game<Manifest, Events>(options);
await game.scenes.mount(({ events }) => ({
  name: "score display",
  enter: () => events.on("score", ({ points }) => console.log(points)),
}));
game.scenes.events.emit("score", { points: 10 });
```

## Test references

Automated evidence marker: [scene-signals]

- [`src/lib/core/runtime/scene.test.ts`](../../src/lib/core/runtime/scene.test.ts)
  covers ordering, `once`, mutation,
  listener errors, and game disposal.
- [`type-tests/scene.ts`](../../type-tests/scene.ts) covers event payload and
  name misuse.
- [`type-tests/svelte-scenes.ts`](../../type-tests/svelte-scenes.ts) covers EventMap propagation through
  `GameReadyContext`.
- `tests/webgpu-scene-signals.spec.ts` covers trusted-origin browser delivery
  and listener cleanup after scene removal when the WebGPU fixture is runnable.

## Notes

The bus is game-scoped, not process-global. `clear()` is idempotent and is
called by game disposal. Browser communication evidence uses the trusted local
preview origin and proves removed listeners stop receiving events.

## Verification

Focused scene tests cover typed payload dispatch, `once`, ordering, mutation,
listener errors, and disposal. Public type tests cover payload inference and
rejected event names and payloads. Trusted-origin browser communication
evidence covers listener cleanup after scene removal.
