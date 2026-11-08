# ecs-system

## Goal

Define an optional, standalone Entity-Component-System (ECS) module for
Squander. The module should let game code compose data and behavior without
mandatory inheritance while keeping entity storage, query execution,
serialization, and world lifetime under one predictable interface.

The design must improve on the legacy singleton experiment in
[`src/lib/core/ecs.ts`](../../src/lib/core/ecs.ts). In particular, a game must
not need an ambient global `ComponentMap` to get strong typing, and an ECS
world must not be a process-wide singleton.

## Status

Draft. Target phase: Phase 3.

This document records goals and design constraints, not an accepted runtime
contract. No new ECS implementation or public package export is promised yet.

## Requirements

- **Provide cheap entity identities.** Entities should be represented by
  lightweight numeric handles, likely integers, rather than allocating an
  object for every entity. The final identity policy must define stale-handle
  behavior, deletion, reuse, and the maximum supported identity range.
- **Scale in a JavaScript runtime.** The implementation must be designed for
  dense storage, low allocation in hot paths, and indexed query execution. It
  must avoid making a per-entity object record and a full-world scan the only
  representation. Before the capability is accepted, a repeatable benchmark
  must establish workloads, memory observations, and performance budgets for
  large populations, including a million-entity scenario where the host can
  run it reliably.
- **Create isolated worlds.** `create_world()`-style construction should give
  each world its own entity allocator, component registry, storage, systems,
  and lifecycle. Multiple worlds must be usable at the same time without
  shared mutable singleton state. Components and entities from one world must
  not be accepted by another world accidentally.
- **Define components locally and type-safely.** Applications should be able
  to define a component schema in a module or factory and pass it to a world.
  Strong typing must not depend on `declare global` or on one application-wide
  `ComponentMap`; two worlds may use the same component name with different
  data types. The chosen registration model must retain useful inference for
  component values, queries, and world export/import.
- **Enforce query membership in TypeScript.** A query that requests position
  and velocity should expose both values as present, while a query that does
  not request a component must not expose it as present. Invalid component
  registrations, query terms, and system access should fail in type tests
  without production type assertions. Runtime checks must still reject stale
  entities and invalid world ownership.
- **Make queries suitable for hot loops.** Queries should support a compact,
  predictable iteration path and a defined policy for entities added, removed,
  or structurally changed during iteration. The contract should distinguish
  read-only access from mutation where that distinction prevents accidental
  invalidation or makes optimization possible.
- **Stay ignorant of system scheduling.** The ECS should provide worlds,
  component access, and typed queries; it should not register, order, or invoke
  systems. A system is a caller-owned composition module that may close over
  one or more worlds, other systems, signals, assets, scenes, input, or domain
  state. It may expose any domain methods and any subset of optional lifecycle
  hooks such as `enter`, `update`, `draw`, and `exit`. The caller decides
  whether the system is global, scene-owned, nested inside another system, or
  used only as a state/query API.
- **Support world-level export and import.** A world must be able to export a
  storage-independent snapshot and import one atomically. The core ECS should
  not require persistence metadata or codecs on every component. JSON, binary
  storage, version migration, compression, and application-specific handling
  of runtime-only values belong in a separate world-level serializer or
  adapter. The ECS contract must still define entity identity preservation or
  remapping, absent components, malformed snapshots, and import failure.
- **Offer a strong developer experience.** The common path—create a world,
  create an entity, add data, query, run systems, save, and load—should be
  discoverable and concise. Error messages should identify the world,
  component, or entity problem that caused a failure. The design should make
  the safe path easier than reaching into storage internals.
- **Keep the module independently useful.** The first implementation should
  not require the renderer, scene stack, input router, Svelte, or a previous
  framework module. Optional adapters may connect ECS updates to a game or
  scene later, but the core world must be usable in isolation and testable in
  a non-browser runtime.

## Scenarios

### Define two independent worlds

An application creates a gameplay world and a tooling world. Each world has a
component named `position`, but the component payloads and storage policies may
differ. An entity created in one world cannot be queried, mutated, or deleted
through the other world.

### Build a typed movement query

An application registers `position` and `velocity`, creates entities with some
or both components, and constructs a query requiring both. The query callback
or iterator receives the entity, a position, and a velocity without optional
checks. Code that tries to use an unrequested component or an unregistered
component fails its type test.

### Run a large population

An application creates a large population with a small set of frequently
queried components, then runs a movement system repeatedly. The benchmark
reports creation, structural changes, query iteration, update throughput, peak
memory, and teardown. It compares the result with the agreed budget instead of
claiming that JavaScript performance is sufficient by intuition.

### Export and restore a world

An application exports a world, then imports the snapshot into a new world with
the same schema. Entity relationships and component values round-trip
according to the documented identity policy. A separate application-owned
serializer may convert that snapshot to JSON, binary data, IndexedDB, or a
network payload. Invalid snapshots produce diagnostic errors without partially
installing a world.

### Compose caller-owned systems with lifecycle control

An application creates ordinary system modules that use typed world queries and
other game features. One module exposes `enter` and `draw`, another exposes only
domain methods and signals, and a third exposes `update`. The application may
attach them to a scene, call them from a global game loop, or compose them into
another module. The ECS does not require registration or provide a scheduler.
The owner controls cleanup and disposal.

### Mutate structure during an update

A system creates, removes, or changes components while a query is iterating.
The result follows an explicit policy—such as deferred structural commands or a
stable query snapshot—and does not silently skip or process an entity twice.
The policy is documented before a performance-sensitive implementation is
accepted.

## Acceptance criteria

- A design review records the selected component-registration approach and
  compares it with at least one viable alternative to the ambient global
  `ComponentMap`. The comparison covers inference, world isolation, module
  boundaries, serialization, and developer ergonomics.
- Type tests prove valid local component definitions, inferred query results,
  isolated world schemas, rejected unregistered components, and rejected
  access to components outside a query. The tests do not rely on production
  type assertions to make invalid code compile.
- Runtime tests prove entity creation and deletion, stale-handle behavior,
  world isolation, component add/remove, query membership, structural mutation
  policy, disposal idempotence, and useful error diagnostics.
- Composition tests and examples prove that a caller-owned system can use a
  world without registration, can expose any subset of lifecycle hooks, and can
  be nested, scene-owned, global, or hook-free. System ordering and hook
  invocation belong to the caller or an existing runtime adapter, not the ECS.
- A benchmark fixture and report measure at least 1,000,000 entities, or record
  the exact host limitation if that population cannot run. The report includes
  the browser or runtime version, workload shape, storage strategy, timings,
  allocation or memory observations where available, and agreed pass/fail
  budgets for the supported environment.
- Export/import tests prove storage-independent snapshots, entity relationship
  handling, malformed input rejection, and all-or-nothing import failure. A
  separate serializer test may prove JSON, binary, migration, or runtime-only
  value policies without making those policies part of the ECS core.
- The public documentation shows the standalone world path, system lifecycle,
  query typing, persistence limits, and the relationship to game and scene
  lifecycles. It does not present an illustrative API as supported until the
  corresponding implementation and tests exist.
- The capability is promoted from Draft only after the implementation, focused
  type/runtime tests, benchmark evidence, and documentation all agree. No
  aggregate legacy ECS coverage result can substitute for this evidence.

## Usage description

The following is illustrative, not an accepted API. It shows the intended
shape: component definitions belong to a world schema rather than to ambient
global declaration merging, and queries carry the type information they need.

```ts
type Position = { x: number; y: number };
type Velocity = { x: number; y: number };

const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });

const world = create_world({ components: { position, velocity } });
const entity = world.create();

world.add(entity, position, { x: 0, y: 0 });
world.add(entity, velocity, { x: 1, y: 0 });

for (const match of world.query().with(position, velocity)) {
  match.position.x += match.velocity.x;
}

type Damage = { value: number };
const damage = define_component<Damage>({ name: "damage" });

world
  .query()
  .with(damage)
  .each(({ read, write }) => {
    const { value: damage_value } = read(damage);
    write(damage).value = Math.max(0, damage_value);
  });

const snapshot = world.export();
world.import(snapshot);

const encounters = create_encounter_system({ world, tile_system });

// The scene chooses which hooks to expose. There is no ECS registration step.
const scene = {
  name: "exploration",
  enter: () => encounters.enter(),
  draw: encounters.draw,
};

const seeds = create_seed_system(); // no enter, update, or draw
```

The final interface may instead use a typed schema factory, component tokens
created by the world, or a query callback that passes component values directly.
The exact query builder and snapshot shape are part of the design work below,
not promises made by this example. The system factories are ordinary
application code; they are shown to illustrate composition, not a required ECS
protocol.

## Test references

No automated ECS tests exist for this draft capability. The existing
[`src/lib/core/ecs.test.ts`](../../src/lib/core/ecs.test.ts) exercises a legacy
singleton experiment and is not evidence for this capability. Planned tests
should use the `[ecs-system]` capability tag and cover the acceptance criteria
above.

## Notes

### Reference implementation observations

The ECS in `/Users/rory/Dev/2025/dungeon-encounters-like` has a pleasant small
surface: `create`, `addComponent`, `removeComponent`, `query`, and `tap` are easy
to use, and systems remain ordinary factories. Its current implementation also
has important limitations for Squander:

- `Map<Entity, ComponentRecord>` allocates a record per entity and scans every
  record for each query.
- A module-level singleton prevents isolated worlds and makes lifetime implicit.
- `declare global` makes the component registry application-wide, couples
  unrelated modules, and makes multiple schemas difficult to express.
- `tap` uses an unchecked assertion, so callers can access missing components
  despite the nominal query types.
- Entity IDs are monotonically allocated without a documented stale-handle or
  reuse policy.
- Persistence, versioning, runtime-only components, and system scheduling are
  outside the interface.

The reference project also uses “system” as a broad name for a caller-owned
composition module. `create_encounter_system` owns encounters, signals,
subscriptions, commands, queries, and drawing. `create_seed_system` owns only
state and domain methods. `create_guidance_system` owns `enter` and `draw`, and
`create_battle_system` composes scenes. These modules do not share one scheduler
contract, and the ECS should not force them to.

The replacement should preserve the useful composition and query ergonomics
where they remain compatible with a denser implementation.

### Design sequence

The next planning slices are:

1. Compare local schema maps, component tokens, and world-scoped component
   factories with type tests before choosing the public seam. See the
   [typing and storage options](design-options.md) for the current comparison
   and provisional direction.
2. Prototype and benchmark at least two storage/query strategies, such as
   sparse-set columns and archetype tables, using the same million-entity
   workloads.
3. Specify entity identity, structural mutation, query iteration, system
   ordering, and world disposal as one lifecycle contract.
4. Specify snapshot shape, external serializers, migrations, identity handling,
   and failure atomicity independently from the storage representation.
5. Add the implementation, game/scene adapter if justified, focused docs, and
   evidence fixtures only after the preceding contracts are accepted.

### Open design questions

- Can the leading local schema plus component-token seam deliver the desired
  ergonomics, and should an optional name-keyed helper exist for the common
  case?
- Should component storage default to sparse-set columns, archetypes, or a
  hybrid selected per component/query workload? Which data shapes deserve a
  typed-array path, and how can object-valued components remain ergonomic?
- Should entity IDs be recyclable with generations, globally unique within a
  session, or stable only within one serialized snapshot?
- Are structural changes deferred during query iteration, or are query views
  stable enough to support immediate changes with documented costs?
- Should Squander document a small optional-hook convention for caller-owned
  systems, or leave even that shape entirely application-defined? The ECS must
  remain scheduler-blind either way.
- Does persistence preserve numeric entity IDs, remap them through a snapshot
  table, or support both modes?
- What should the world snapshot contain, and where should external serializers
  and schema migrations attach without reintroducing ambient global state?
- Is an optional nominal `WorldKey` worth requiring for applications that need
  compile-time separation between worlds with identical schemas, or are
  runtime ownership checks sufficient for the common path?
- Is a built-in ECS the supported Phase 3 capability, or should Squander ship
  only a deep integration seam for application-owned ECS implementations?

These questions are intentionally unresolved while the capability is Draft.
