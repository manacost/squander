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

Implemented.

This is an optional ECS module.

The supported v0 implementation is available from the public core module. It
uses local component tokens, dense sparse-set storage, monotonic IDs by default,
an opt-in generational identity policy, and caller-owned system composition.
Archetype and typed-column storage remain future optimization seams.

## Requirements

- **Provide cheap entity identities.** Entities are lightweight numeric handles.
  Monotonic IDs are never reused. Generational worlds pack a 26-bit slot and a
  26-bit generation into a safe integer, reuse slots, reject stale handles, and
  retire slots at the generation limit.
- **Scale in a JavaScript runtime.** The implementation must be designed for
  dense storage, low allocation in hot paths, and indexed query execution. It
  must avoid making a per-entity object record and a full-world scan the only
  representation. Before the capability is accepted, a repeatable benchmark
  must establish workloads, memory observations, and performance budgets for
  large populations, including a million-entity scenario where the host can
  run it reliably.
- **Create independent worlds.** `create_world()` gives each world its own
  component storage, membership set, and lifecycle. Multiple worlds must be
  usable at the same time without shared mutable singleton state. Numeric
  entities are numeric and can be explicitly coordinated with `adopt()`, while
  component tokens and membership are checked at runtime.
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
- **Support world-level export and import.** A world can export a
  storage-independent snapshot and import one atomically. The core ECS should
  not require persistence metadata or codecs on every component. JSON, binary
  storage, version migration, compression, and application-specific handling
  of runtime-only values belong in a separate world-level serializer or
  adapter. Snapshots are version 1, preserve numeric entity identities, require
  a matching identity policy, clone structured-cloneable values, allow absent
  components, and reject malformed input before changing the world.
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
differ. An entity is not a member of the other world until the caller
explicitly adopts it. Component tokens are still world-checked at runtime.

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
  world membership, component add/remove, query membership, structural
  mutation policy, and useful error diagnostics.
- Composition tests and examples prove that a caller-owned system can use a
  world without registration, can expose any subset of lifecycle hooks, and can
  be nested, scene-owned, global, or hook-free. System ordering and hook
  invocation belong to the caller or an existing runtime adapter, not the ECS.
- A benchmark fixture and report measure at least 1,000,000 entities, or record
  the exact host limitation if that population cannot run. The report includes
  the browser or runtime version, workload shape, storage strategy, timings,
  allocation or memory observations where available, and agreed pass/fail
  budgets for the supported environment. Matching profiles use a 20% timing
  regression budget and a 15% memory regression budget.
- Export/import tests prove storage-independent snapshots, identity
  preservation, malformed input rejection, and all-or-nothing import failure.
  A separate serializer test may prove JSON, binary, migration, or runtime-only
  value policies without making those policies part of the ECS core.
- The public documentation shows the standalone world path, system lifecycle,
  query typing, persistence limits, and the relationship to game and scene
  lifecycles. It does not present an illustrative API as supported until the
  corresponding implementation and tests exist.
- The capability is promoted from Draft only after the implementation, focused
  type/runtime tests, benchmark evidence, and documentation all agree. No
  aggregate legacy ECS coverage result can substitute for this evidence.

## Usage description

The following is the supported initial API shape: component definitions belong
to a local world schema rather than ambient global declaration merging, and
queries carry the type information they need.

```ts
// Import the world factory and component definition helper.
import { create_world, define_component } from "squander";

// Describe the data stored by each position and velocity component.
type Position = { x: number; y: number };
type Velocity = { x: number; y: number };

// Create typed tokens for the local world schema.
const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });

// Create a world whose schema contains both tokens.
const world = create_world({ position, velocity });
// Allocate an entity, then attach its initial component values.
const entity = world.create();
world.add(entity, position, { x: 0, y: 0 });
world.add(entity, velocity, { x: 1, y: 0 });

// Require both components before iterating matching entities.
world
  .query()
  .with(position, velocity)
  .each(({ read, write }) => {
    // Read both values and write the updated position.
    const current = read(position);
    write(position).x += read(velocity).x;
    write(position).y = current.y + read(velocity).y;
  });

// Add a second component to the same local schema.
type Damage = { value: number };
const damage = define_component<Damage>({ name: "damage" });

// Query only entities that have damage, then clamp its value through write().
world
  .query()
  .with(damage)
  .each(({ read, write }) => {
    const { value: damage_value } = read(damage);
    write(damage).value = Math.max(0, damage_value);
  });

// Export and import the complete world at the world boundary.
const snapshot = world.export();
world.import(snapshot);

// Opt into reusable numeric handles with stale-handle checks.
const simulation_world = create_world({ position, velocity }, { entity_policy: "generational" });

// Choose live match views or detached copies for inspection.
const live_matches = world.query().with(position).toArray();
const copied_matches = world.query().with(position).toSnapshots();

const encounters = create_encounter_system({ world, tile_system });

// The scene chooses which hooks to expose. There is no ECS registration step.
const scene = {
  name: "exploration",
  enter: () => encounters.enter(),
  draw: encounters.draw,
};

const seeds = create_seed_system(); // no enter, update, or draw
```

`toArray()` returns live match views. `toSnapshots()` returns detached copies
that can be read without mutating the world. Structural calls made through a
match view (`add`, `remove`, and `destroy`) are deferred until the current
query finishes, including when a query callback throws. `import()` is rejected
while a query is active.

Monotonic IDs are never reused. Generational IDs use a 26-bit slot and
generation packed into a safe integer; destroying or clearing an entity advances
the slot generation so stale handles fail runtime ownership checks. Snapshot
imports preserve IDs and require the same identity policy as the destination
world.

Component values are object-shaped and must be structured-cloneable for
`export()`, `import()`, and `toSnapshots()`. Functions, DOM objects, GPU handles,
and other runtime-only values belong behind an application-owned serializer.

The system factories are ordinary
application code; they are shown to illustrate composition, not a required ECS
protocol.

The application-owned ECS Arena proof game in
`src/routes/(game)/scenes/ecs-arena/+page.svelte` exercises this contract in a
real WebGPU loop. It composes input, spawning,
movement, combat, cleanup, and rendering around one local world without adding
an ECS scheduler or scene adapter.

## Test references

The focused runtime contract lives in
[`src/lib/core/ecs.test.ts`](../../src/lib/core/ecs.test.ts), with public
inference and misuse checks in [`type-tests/ecs.ts`](../../type-tests/ecs.ts).
These tests cover world ownership, query typing, mutation, stale handles,
identity policies, snapshots, and caller-owned system composition. The Node and
browser benchmark evidence lives in
[`verification/ecs-benchmark.test.ts`](../../verification/ecs-benchmark.test.ts)
and [`tests/ecs-browser.spec.ts`](../../tests/ecs-browser.spec.ts). The
capability tag for this evidence is [ecs-system].

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

### Completed design sequence

The implementation completed the following decisions:

1. Compare local schema maps, component tokens, and world-scoped component
   factories with type tests before choosing the public seam. See the
   [typing and storage options](design-options.md) for the completed comparison
   and selected direction.
2. Select dense sparse-set columns behind the public object-first seam after a
   shared storage comparison and million-entity workloads.
3. Specify monotonic and generational numeric identity, world membership,
   deferred structural changes, stale-handle behavior, and import boundaries.
4. Specify version 1 snapshots and leave JSON, binary formats, migrations,
   compression, and runtime-only values to application-owned serializers.
5. Keep systems caller-owned and scheduler-blind; no game or scene adapter is
   required by the core contract.

### Open design questions

- Does the local schema plus component-token seam need a name-keyed helper for
  the common case, or is the current object-token path sufficient?
- Should component storage default to sparse-set columns, archetypes, or a
  hybrid selected per component/query workload? Which data shapes deserve a
  typed-array path, and how can object-valued components remain ergonomic?
- Should immediate structural mutation or additional storage backends be added
  after profiling? They remain deferred until a workload demonstrates a need.
- Should a future adapter connect ECS worlds to a particular game or scene
  lifecycle? The core remains scheduler-blind and requires no adapter.

These are future optimization or integration questions; they do not change the
supported v0 contract.
