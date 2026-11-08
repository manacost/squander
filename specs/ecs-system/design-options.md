# ECS interface and storage options

This note compares alternatives for the Draft
[`ecs-system`](spec.md) capability. It is a design record, not a supported API.

## What the existing global map buys us

The reference project defines component payloads first and then augments one
ambient `ComponentMap`:

```ts
declare global {
  export type ComponentMap = {
    position: PositionComponent;
    velocity: VelocityComponent;
  };
}
```

The ECS module derives `ComponentType`, `ComponentRecord`, and queried records
from that map. This gives a compact call site:

```ts
ECS.addComponent(entity, { type: "position", x: 0, y: 0 });
const moving = ECS.query("position", "velocity");
```

The pattern is not inherently weak. Its costs are the ambient registry and the
boilerplate required to keep the registry synchronized. It also makes the type
system appear stronger than the runtime: `tap<"position">(entity)` can assert
that a component exists without checking it, and the singleton has no way to
separate two worlds with different schemas.

The important observation is that the type registry and the storage layout are
separate seams. Replacing the global map does not require exposing an ECS's
internal tables, and choosing a token does not by itself make queries fast.

## Option 1: local schema map

Move the map from ambient global scope into a value passed to the world:

```ts
const components = define_components({
  position: define_component<Position>({
    name: "position",
  }),
  velocity: define_component<Velocity>({
    name: "velocity",
  }),
});

const world = create_world({ components });
const entity = world.create();

world.add(entity, components.position, { x: 0, y: 0 });
world.add(entity, components.velocity, { x: 1, y: 0 });

for (const match of world.query(components.position, components.velocity)) {
  match.position.x += match.velocity.x;
}
```

The schema object is the replacement for `ComponentMap`, but it is explicit,
module-scoped, and can be passed to many worlds intentionally. Each world can
assign dense numeric component IDs while retaining the schema's names for
diagnostics and persistence.

Strengths:

- Best balance of familiar DX and local type inference.
- Component definitions can be composed and exported from ordinary modules.
- A query can infer required values from a tuple of schema tokens.
- Runtime type information and component identity have a natural home on the
  component descriptor; export/import policy can remain at the world seam.
- The implementation can compile tokens to numeric IDs and never use strings in
  the hot loop.

Risks:

- If callers use string keys as the primary query surface, string widening can
  weaken tuple inference unless the interface is carefully designed.
- Two worlds built from the same schema have the same static component types;
  runtime ownership checks are still required for entities and world-bound
  handles.
- A schema that exposes every storage choice can become a shallow configuration
  layer and make optimization harder later.

## Option 2: component tokens

Make the component token the primary seam:

```ts
const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });

const world = create_world({ components: { position, velocity } });
const entity = world.create();

world.add(entity, position, { x: 0, y: 0 });

for (const match of world.query(position, velocity)) {
  match.position.x += match.velocity.x;
}
```

The token carries the TypeScript payload type and an opaque runtime identity.
The world registry maps that identity to a dense component ID. Names are useful
for diagnostics and snapshots, but they are not the lookup key in a hot query.

Strengths:

- Strongest protection against misspelled keys and accidental registration of
  a token from an unrelated schema.
- Object identity is a natural runtime lookup key and can be made world-local.
- Query tuples preserve component inference without relying on literal string
  inference.
- The token is a good seam for diagnostics, storage planning, and future query
  compilation.

Risks:

- More ceremony than `query("position", "velocity")`, especially for small
  games.
- Tokens can still be structurally too broad if their generic payload is
  covariant or erased. The type must preserve token identity and reject a token
  that is not registered with the world.
- Exported data cannot contain the token object directly; snapshots need a
  stable schema name or component ID mapping.

## Option 3: world-scoped component factory

Create components through the world itself:

```ts
const world = create_world();
const position = world.define_component<Position>({ name: "position" });
const velocity = world.define_component<Velocity>({ name: "velocity" });

const entity = world.create();
world.add(entity, position, { x: 0, y: 0 });
```

This makes runtime ownership obvious: a component belongs to exactly one
world. It is attractive for tools and short-lived simulations where schemas are
constructed dynamically.

Strengths:

- Strongest runtime isolation between worlds.
- No separate registration step can accidentally omit a component from the
  world.
- Component IDs can be allocated immediately and densely.

Risks:

- Component definitions become coupled to world construction and are harder to
  share across systems, scenes, tests, and serialization code.
- A module cannot conveniently export a reusable gameplay schema without also
  exporting a factory that receives the world.
- The interface encourages mutable registration and makes it easier to use a
  component before all system or export/import contracts are installed.
- It does not solve the storage problem; dynamic registration can make query
  compilation and archetype planning more difficult.

## Option 4: generated registries

An application or build tool can generate a registry from component definitions:

```ts
import { components } from "./generated-components.js";

const world = create_world(components);
```

Generated registries can provide excellent static guarantees, compact numeric
IDs, and schema validation before the game starts. They are a poor default for
Squander because they require build tooling, complicate dynamic tools and tests,
and make the framework depend on a project layout or generation step. They are
worth keeping as a future adapter if profiling or large projects demonstrate a
real benefit.

## Type-safety comparison

The strongest common contract is a typed query over a local schema or token
tuple:

```ts
for (const match of world.query(components.position, components.velocity)) {
  match.position.x += match.velocity.x;
  match.velocity.x *= 0.98;
}
```

The returned match contains exactly the requested component values. A broad
`get(entity): ComponentRecord` or unchecked `tap()` should not be the primary
system interface because it reintroduces optional values and assertion-based
access. If a direct entity lookup is needed for exceptional code, it should
return an optional value or require a component token and report absence at
runtime.

The type-safety ordering is:

1. **World-scoped tokens:** strongest runtime ownership, more ceremony.
2. **Local schema map with token values:** nearly the same static safety and
   better module composition.
3. **Local string-key schema:** good DX and compile-time key checking, but more
   care is needed around literal widening and cross-world handles.
4. **Ambient global map:** compact call sites, but global coupling and weak
   world isolation; the legacy `tap` pattern is not safe enough.

The second option gives the best leverage for this project. It keeps component
definitions composable while making the runtime token explicit. It also permits
an ergonomic name-keyed helper for inspection or migration without making
strings the hot-path query representation.

## Systems are caller-owned composition modules

The scheduler example is not the right default for this ECS. A scheduler that
registers systems, orders them, and invokes `world.step()` turns the ECS into a
second game loop. It also assumes that every useful system has the same shape.
The reference project demonstrates a broader and more useful model:

- `create_encounter_system(tile_system)` returns signals, commands, queries,
  `enter`, cleanup, and `draw`, but no `update`.
- `create_seed_system()` returns state and domain methods, but neither
  `enter`, `update`, nor `draw`.
- `create_guidance_system(seeds)` returns `enter` and `draw`.
- `create_battle_system()` returns events and commands that compose a scene.
- `createCollisionSystem()` returns event methods and targeted movement/query
  operations rather than a generic scheduler callback.

Some of these modules use entities and components; some do not. The name
“system” describes a composition role, not an ECS protocol.

The ECS should therefore expose only the world and query seam. A caller-owned
module can use a lightweight structural convention when useful:

```ts
type OwnedSystem<Context> = {
  enter?: (context: Context) => void | (() => void);
  update?: (time: UpdateTime) => void;
  draw?: () => void;
  exit?: () => void;
  // Other domain methods, signals, and state are intentionally allowed.
};
```

This is an illustrative consumer-side type, not an ECS export. A scene, game
loop, parent system, or application can choose which hooks to call and how to
compose them:

```ts
const encounter = create_encounter_system({ world, tile_system });

const scene = {
  name: "exploration",
  enter: () => encounter.enter?.(),
  draw: () => encounter.draw?.(),
};

const seeds = create_seed_system(); // no lifecycle hooks required
```

The ECS must not expose `add_system`, `remove_system`, `step`, or a required
system interface. A scheduler can still exist as an application-owned helper,
and the existing scene/game runtime can act as one, but it belongs above the ECS
seam. This preserves caller control over global systems, scene-owned systems,
subsystems, and systems that are purely stateful APIs.

## Object-first component values

The leading DX should treat every component as an object-shaped value:

```ts
type Damage = { value: number };

const damage = define_component<Damage>({ name: "damage" });

damage_query.each(({ read, write }) => {
  const { value: damage_value } = read(damage);
  write(damage).value = Math.max(0, damage_value);
});
```

This works for nested objects and arrays without changing the query interface:

```ts
type Inventory = {
  item_ids: string[];
  quantities: number[];
};
```

There is no major type-system trade-off. The component token still carries the
complete `Inventory` type, and `read()` or `write()` can return that value with
its nested arrays intact. The costs are runtime and ownership concerns:

- A separately allocated object and array per entity can create substantial
  memory pressure and garbage-collection work at million-entity scale.
- Variable-length arrays have weaker locality than flat numeric columns and
  can cause many small allocations or repeated resizing.
- If the ECS stores object references directly, callers can mutate a component
  through an old reference or retain it after removal. If it clones values,
  add/import operations become more expensive. The ownership policy must be
  explicit.
- A read-only type must account for nested arrays. A shallow `Readonly<T>` does
  not prevent `read(component).item_ids.push(...)`; a deep readonly view or a
  clearly documented read convention may be needed.
- A world snapshot must define whether nested arrays are copied, transferred,
  or merely referenced. External serializers can choose their own wire format,
  but `world.export()` should not accidentally expose mutable internal storage.

These are not reasons to reject object-shaped components. They are reasons to
keep large repeated data behind handles or shared buffers when profiling shows
that nested allocations dominate. Fixed-size numeric arrays can later use
typed-array or columnar internals without changing the component-facing API.

The initial public design should therefore omit a `storage` option. Let the ECS
store object values in the simplest correct representation first, then compare
sparse sets, archetypes, pooling, and typed-array layouts with the same object
shapes and workloads. A later optimization should be additive rather than a
requirement in every component declaration.

## Performance alternatives

The current `Map<Entity, ComponentRecord>` implementation is a useful
correctness baseline, not a large-population design. It allocates a record per
entity and scans every record for every query. The typing seam does not force
that representation.

### Sparse-set columns

Store one dense entity array and one dense value array per component, plus a
sparse entity-to-index lookup. Membership is constant time, adding and removing
components is predictable, and a query can iterate the smallest required
component set before checking the other sets.

This is a strong first implementation for dynamic 2D gameplay. Swap-remove is
cheap, but it makes iteration order unstable unless the contract explicitly
preserves order at additional cost. Generic object values remain ergonomic;
numeric components can use typed-array columns later.

### Archetype tables

Group entities by their complete component set. Each archetype owns packed
columns, so a query iterates only matching tables and can keep hot values
together. This is attractive for millions of entities and systems that repeat
the same queries.

The cost is structural movement: adding or removing one component moves an
entity between tables and can copy several columns. The implementation also
needs clear deferred-mutation rules and efficient archetype matching.

### Columnar typed storage

Represent numeric fields such as position and velocity with `Float32Array` or
`Float64Array` columns. This reduces object allocation and improves locality,
but it requires a data-layout description and a policy for object-valued or
variable-sized components. It should be an optimization behind a component
descriptor, not a requirement for every component.

### Hybrid storage

Use archetypes or sparse sets for general components and specialized columns
for hot numeric data. This may produce the best result for a 2D engine, but it
also creates the most implementation complexity. It should be justified by
benchmark evidence rather than introduced as a configuration matrix on day
one.

The performance recommendation is therefore provisional: use a local
schema-map-plus-token interface, compile tokens to numeric IDs, and keep sparse
sets or archetypes behind the seam. Benchmark sparse-set and archetype
implementations with the same workloads before selecting one or adopting a
hybrid. Do not expose table, column, or sparse-index details in the first user
contract.

## Decision for this slice

Select **local schema maps whose values are opaque component tokens** as the
leading design. This is a hybrid authoring interface, not a commitment to a
particular storage implementation:

- `define_components({...})` replaces ambient `declare global` boilerplate.
- `schema.position` provides the typed token used by `add` and `query`.
- `create_world(schema)` creates an isolated registry and compiles tokens to
  world-local numeric IDs.
- System queries expose only requested values; direct broad records are not a
  supported hot-loop seam.
- Systems remain caller-owned factories or records with optional hooks; the ECS
  does not register, order, or invoke them.
- Component descriptors should carry runtime identity and type information;
  storage strategy and persistence format remain internal or world-level until
  benchmark evidence justifies another seam.

Runtime world ownership checks are mandatory. An optional nominal world key can
be added for applications that need compile-time separation between worlds with
identical schemas, but requiring every caller to create a `Symbol` would add
ceremony to the common path before the need is demonstrated.

Keep these alternatives open until the storage benchmark:

- a name-keyed query helper for the common case;
- world-scoped token factories for dynamic tools;
- sparse-set, archetype, or hybrid internals;
- typed-array layouts for numeric component families.

This decision removes the ambient global registry without making the public
interface depend on the eventual performance implementation.
