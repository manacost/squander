# ecs-system-composition

## Goal

Offer an optional typed helper for ordered ECS system composition without
turning the ECS into a mandatory scheduler or registration service.

## Status

Implemented.

## Requirements

- `create_ecs_system_pipeline` accepts an ordered list of caller-owned systems.
- Each system receives a typed `EcsSystemContext` with the selected world and
  one shared `UpdateTime` snapshot.
- A system may be disabled by a boolean or an `enabled` predicate.
- `run()` is explicit and caller-owned; it does not create an animation loop,
  register ambient systems, or connect to `Game`.
- System failures propagate to the caller and stop later systems in that run.
- Structural deferral and world ownership remain the ECS world's policies.

## Scenarios

### Ordered simulation

An application runs input, movement, combat, and cleanup systems in a declared
order and can call the same pipeline from a game update or a test.

### Optional system

A debug system is present in the pipeline but disabled in production through a
caller-owned predicate.

### Multiple worlds

One pipeline shape runs independently against a gameplay world and an editor
world. The pipeline does not retain or globally register either world.

## Acceptance criteria

- Systems run in stable declaration order without inheritance.
- Every system in one run observes the same `UpdateTime` object.
- Disabled systems are skipped without changing later order.
- Structural mutation remains deferred by the world implementation.
- A thrown system error reaches the caller unchanged and prevents later systems.
- Type inference preserves the selected schema and rejects foreign components.
- The helper has no renderer, Svelte, input, or game-loop dependency.

## Usage description

```ts
const simulation = create_ecs_system_pipeline<typeof schema>([
  { update: ({ world, time }) => movement_system(world, time.delta_seconds) },
  { enabled: debug_enabled, update: ({ world }) => debug_system(world) },
]);

simulation.run(world, time);
```

Declare the schema type at construction because the pipeline is reusable across
multiple worlds and receives its world only when `run()` is called.

## Test references

- [`src/lib/core/ecs_systems.test.ts`](../../src/lib/core/ecs_systems.test.ts)
  covers ordering, predicates, shared timing, world isolation, deferred
  structural mutation, and failure propagation.
- [`type-tests/ecs.ts`](../../type-tests/ecs.ts) covers schema and timing
  inference through the public `squander/ecs` export.

Planned verification includes a direct-function composition comparison before
the helper is used as a performance-sensitive default.

## Notes

The existing ECS system contract remains caller-controlled. This helper is a
composition convenience, not a global registry or mandatory scheduler.
