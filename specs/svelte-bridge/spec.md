# svelte-bridge

## Goal

Connect Svelte UI to game state and actions with strong inferred types and per-instance ownership.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Expose typed read-only subscriptions and typed commands while keeping publication authority in game code.
- Infer state values, command parameters, and return types from game definitions; preserve async returns.
- Keep the core independent of Svelte. Publish UI-relevant changes rather than forcing the whole simulation to be reactive each frame.
- The Svelte host owns its game instance and disposes it on unmount; subscriptions are cleaned up.
- Use per-instance hosts rather than a global game/UI root.
- Future scenes may own overlays within the host through an optional adapter. Scene overlay management is deferred.

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

Illustrative: bridge.state.health.subscribe(...) and bridge.commands.use_item(item_id). Convenience reactive adapters may be layered over these primitives.

## Test references

The Svelte-independent bridge core is currently covered by
[`src/lib/core/runtime/bridge.test.ts`](../../src/lib/core/runtime/bridge.test.ts)
in the `[svelte-bridge] core bridge` suite, with public command inference in
[`type-tests/bridge.ts`](../../type-tests/bridge.ts). These tests do not claim
Svelte mounting, SSR, or host isolation.

Planned verification for the remaining replacement-framework contract:

Public API type tests, real Svelte mount/unmount and action tests, SSR/package-consumer smoke tests.

Use `[svelte-bridge]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-017. Open: exact subscription shape, SSR factory boundary, nested-readonly/runtime aliasing policy, command behavior after disposal, and notification scheduling.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
