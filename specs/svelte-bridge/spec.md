# svelte-bridge

## Goal

Connect Svelte UI to game state and actions with strong inferred types and per-instance ownership.

## Status

Implemented. The Svelte 5 adapter seam is implemented with a
typed `create_game_adapter` factory and `<GameHost>` render-prop component.
The adapter exposes one readonly view containing `state`, lifecycle `status`,
an initialization `error`, and typed `commands`; game code receives the only
`publish` function.

The Phase 2 contract is implemented and verified below. Phase 3-a adds the
recommended `<Game onReady={...}>` host and scene-owned Svelte UI through a
contextual `create_ui()` helper; the core runtime remains Svelte-independent.

## Requirements

- Expose typed read-only subscriptions and typed commands while keeping publication authority in game code.
- Infer state values, command parameters, and return types from game definitions; preserve async returns.
- Keep the core independent of Svelte. Publish UI-relevant changes rather than forcing the whole simulation to be reactive each frame.
- The Svelte host owns its game instance and disposes it on unmount; subscriptions are cleaned up.
- Use per-instance hosts rather than a global game/UI root.
- The `Game` component owns its private scene UI layer. A scene creates, mounts,
  updates, and disposes its own UI through `create_ui`; consumers do not mount a
  separate overlay host.

## Scenarios

### Inventory action

UI reads inventory and invokes a typed use-item command; the command checks gameplay rules instead of exposing mutable internals.

### Host removed during setup

Navigation unmounts the host before loading completes. Subscriptions end and the disposed game cannot start later.

### Two hosts

State and commands from one game remain isolated from another.

## Acceptance criteria

- Compile inferred subscriptions and sync/async commands; expected-error tests reject wrong arguments, unknown commands, and access to a state publisher.
- Mount a UI, publish a game-state change, and verify displayed output; invoke UI action and verify the intended command/result.
- Unmount and verify no later publication updates that UI and no late setup starts its game.
- Run independent hosts and verify cross-instance state/resources do not leak.
- Verify SSR/import behavior under an explicit contract before claiming SvelteKit support.

## Usage description

Illustrative: use `<Game onReady={start_game}>`, then call
`scenes.switch(scenes.create(({ create_ui }) => ...))` from `start_game`.
Scene UI props remain typed and callbacks remain application-owned.

## Test references

The Svelte-independent bridge core is covered by
[`src/lib/core/runtime/bridge.test.ts`](../../src/lib/core/runtime/bridge.test.ts)
in the `[svelte-bridge] core bridge` suite, with public command inference in
[`type-tests/bridge.ts`](../../type-tests/bridge.ts). The adapter and browser
suites provide the Svelte mounting, SSR, and host-isolation evidence.

The adapter unit suite
[`src/lib/svelte/adapter.test.ts`](../../src/lib/svelte/adapter.test.ts) covers
typed snapshot publication, command invocation, setup failure, and disposal
during setup. Public adapter type coverage is in
[`type-tests/svelte-adapter.ts`](../../type-tests/svelte-adapter.ts).

The real browser fixture
[`tests/webgpu-svelte-adapter.spec.ts`](../../tests/webgpu-svelte-adapter.spec.ts)
mounts the host, observes ready state, invokes a typed command, navigates away,
and recreates an isolated host instance.

The scene-owned UI path is covered by
[`src/lib/svelte/Game.ssr.test.ts`](../../src/lib/svelte/Game.ssr.test.ts),
[`type-tests/svelte-scenes.ts`](../../type-tests/svelte-scenes.ts), and the real
WebGPU fixture
[`tests/webgpu-scene-ui.spec.ts`](../../tests/webgpu-scene-ui.spec.ts). It
verifies SSR-safe initial markup, typed scene UI props, two isolated `Game`
instances, stacked UI ordering, callback-driven switching, failed `onReady`, and
renderer readback.

Notification scheduling is covered by the adapter unit suite, and the isolated
consumer smoke test covers published adapter import, runtime, and declarations.
Two-host browser isolation is covered by
[`tests/webgpu-svelte-adapter.spec.ts`](../../tests/webgpu-svelte-adapter.spec.ts),
and SSR component import/rendering is covered by
[`src/lib/svelte/GameHost.ssr.test.ts`](../../src/lib/svelte/GameHost.ssr.test.ts).
`squander/svelte/adapter` is Node-safe; `squander/svelte` also
contains the Svelte component entry and must be compiled by a Svelte-aware
consumer.

The composition route at `src/routes/(docs)/docs/examples/playground/+page.svelte`
and its browser fixture provide composition evidence across the adapter and
runtime capabilities.

The adapter remains intentionally optional; core consumers do not require
Svelte, and the component entry is compiled by Svelte-aware consumers.

## Notes

AD-017. The Phase 2 subscription shape, SSR boundary, readonly view, command
disposal behavior, and notification scheduling are implemented as documented;
scene-owned Svelte UI is implemented by the Phase 3-a `Game` host; richer
reactive helpers remain future work.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
