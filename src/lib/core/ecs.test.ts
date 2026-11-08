import { describe, expect, it } from "vitest";
import { create_world, define_component, define_components } from "./ecs.js";

type Position = { x: number; y: number };
type Velocity = { x: number; y: number };
type Damage = { value: number; history: number[] };

const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });
const damage = define_component<Damage>({ name: "damage" });
const schema = define_components({ position, velocity, damage });

describe("ecs worlds", () => {
  it("stores object-shaped components and exposes typed fluent queries", () => {
    const world = create_world(schema);
    const entity = world.create();
    world.add(entity, position, { x: 1, y: 2 });
    world.add(entity, velocity, { x: 3, y: 4 });

    world
      .query()
      .with(position, velocity)
      .each(({ read, write }) => {
        const { x, y } = read(position);
        write(position).x = x + read(velocity).x;
        write(position).y = y + read(velocity).y;
      });

    expect(world.read(entity, position)).toEqual({ x: 4, y: 6 });
    expect(world.query().with(position, velocity).toArray()).toHaveLength(1);
    expect(world.query().with(position).without(velocity).toArray()).toHaveLength(0);
  });

  it("supports nested arrays without changing the object-first storage path", () => {
    const world = create_world(schema);
    const entity = world.create();
    world.add(entity, damage, { value: 12, history: [4, 8] });

    const snapshots = world.query().with(damage).toSnapshots();
    const snapshot = snapshots[0];
    const copied_damage = snapshot.read(damage);
    copied_damage.history.push(12);

    expect(world.read(entity, damage)).toEqual({ value: 12, history: [4, 8] });
  });

  it("defers structural changes until a query finishes", () => {
    const world = create_world(schema);
    const first = world.create();
    const second = world.create();
    world.add(first, position, { x: 0, y: 0 });
    world.add(second, position, { x: 1, y: 0 });

    const visited: number[] = [];
    world
      .query()
      .with(position)
      .each(({ entity, add, destroy }) => {
        visited.push(entity);
        add(velocity, { x: 1, y: 0 });
        if (entity === first) destroy();
      });

    expect(visited).toHaveLength(2);
    expect(world.has(first)).toBe(false);
    expect(world.query().with(position, velocity).toArray()).toHaveLength(1);
  });

  it("keeps worlds independent while allowing explicit entity adoption", () => {
    const first_world = create_world({ position });
    const second_world = create_world({ position });
    const entity = first_world.create();
    first_world.add(entity, position, { x: 1, y: 1 });

    expect(() => second_world.read(entity, position)).toThrow(/does not belong to this world/);
    second_world.adopt(entity);
    second_world.add(entity, position, { x: 9, y: 9 });

    expect(first_world.read(entity, position)).toEqual({ x: 1, y: 1 });
    expect(second_world.read(entity, position)).toEqual({ x: 9, y: 9 });
  });

  it("round-trips a world snapshot and rejects malformed imports atomically", () => {
    const world = create_world(schema);
    const entity = world.create();
    world.add(entity, position, { x: 2, y: 3 });
    world.add(entity, damage, { value: 7, history: [1, 2, 4] });
    const snapshot = world.export();

    world.destroy(entity);
    expect(world.query().with(position).toArray()).toHaveLength(0);
    world.import(snapshot);

    expect(world.read(entity, position)).toEqual({ x: 2, y: 3 });
    expect(world.read(entity, damage)).toEqual({ value: 7, history: [1, 2, 4] });

    const malformed = {
      ...snapshot,
      entities: [entity],
      components: {
        position: [{ entity: entity + 1, value: { x: 0, y: 0 } }],
      },
    };
    expect(() => {
      world.import(malformed);
    }).toThrow(/references unknown entity/);
    expect(world.read(entity, position)).toEqual({ x: 2, y: 3 });
  });

  it("reports foreign component tokens", () => {
    const world = create_world({ position });
    const foreign_position = define_component<Position>({ name: "position" });
    const entity = world.create();

    expect(() => {
      world.add(entity, foreign_position, { x: 0, y: 0 });
    }).toThrow(/does not belong to this world/);

    expect(() => world.query().with(foreign_position).toArray()).toThrow(/does not belong to this world/);
  });

  it("preserves every chained exclusion term", () => {
    const world = create_world(schema);
    const entity = world.create();
    world.add(entity, position, { x: 0, y: 0 });

    expect(world.query().without(velocity).without(damage).toArray()).toHaveLength(1);
  });

  it("flushes deferred structural changes when a query callback throws", () => {
    const world = create_world(schema);
    const entity = world.create();
    world.add(entity, position, { x: 0, y: 0 });

    expect(() => {
      world
        .query()
        .with(position)
        .each(({ add }) => {
          add(velocity, { x: 1, y: 0 });
          throw new Error("stop iteration");
        });
    }).toThrow("stop iteration");

    expect(world.query().with(position, velocity).toArray()).toHaveLength(1);
  });

  it("rejects import while a query is active", () => {
    const world = create_world({ position });
    const entity = world.create();
    world.add(entity, position, { x: 1, y: 2 });
    const snapshot = world.export();

    expect(() => {
      world
        .query()
        .with(position)
        .each(() => {
          world.import(snapshot);
        });
    }).toThrow(/cannot import during query iteration/);
  });

  it("rejects duplicate snapshot entity IDs before changing the world", () => {
    const world = create_world({ position });
    const entity = world.create();
    world.add(entity, position, { x: 1, y: 2 });
    const snapshot = world.export();
    const malformed = { ...snapshot, entities: [entity, entity] };

    expect(() => {
      world.import(malformed);
    }).toThrow(/contains entity .* more than once/);
    expect(world.read(entity, position)).toEqual({ x: 1, y: 2 });
  });

  it("does not retain caller-owned values imported from a snapshot", () => {
    const source = create_world({ position });
    const entity = source.create();
    source.add(entity, position, { x: 1, y: 2 });
    const snapshot = source.export();
    const destination = create_world({ position });

    destination.import(snapshot);
    const imported_entry = snapshot.components.position[0];
    Object.assign(imported_entry.value, { x: 99 });

    expect(destination.read(entity, position)).toEqual({ x: 1, y: 2 });
  });

  it("advances the monotonic allocator after importing a high entity ID", () => {
    const world = create_world({ position });
    const imported_entity = 10_000_000;
    world.import({
      format_version: 1,
      entity_policy: "monotonic",
      entities: [imported_entity],
      components: { position: [{ entity: imported_entity, value: { x: 1, y: 2 } }] },
    });

    expect(world.create()).toBeGreaterThan(imported_entity);
  });

  it("reuses generational slots while rejecting stale handles", () => {
    const world = create_world({ position }, { entity_policy: "generational" });
    const first = world.create();
    world.add(first, position, { x: 1, y: 2 });
    world.destroy(first);
    const second = world.create();

    expect(second).not.toBe(first);
    expect(world.has(first)).toBe(false);
    expect(() => world.read(first, position)).toThrow(/does not belong to this world/);

    world.clear();
    const third = world.create();
    expect(third).not.toBe(second);
    expect(world.has(second)).toBe(false);
  });

  it("round-trips generational snapshots and rejects policy mismatches atomically", () => {
    const source = create_world({ position }, { entity_policy: "generational" });
    const entity = source.create();
    source.add(entity, position, { x: 4, y: 5 });
    const snapshot = source.export();
    const destination = create_world({ position }, { entity_policy: "generational" });
    destination.import(snapshot);

    expect(destination.read(entity, position)).toEqual({ x: 4, y: 5 });
    expect(() => {
      create_world({ position }).import(snapshot);
    }).toThrow(/identity policy/);
    expect(destination.read(entity, position)).toEqual({ x: 4, y: 5 });
  });

  it("adopts generational handles without allowing stale generations", () => {
    const source = create_world({ position }, { entity_policy: "generational" });
    const entity = source.create();
    source.destroy(entity);
    const replacement = source.create();
    const destination = create_world({ position }, { entity_policy: "generational" });

    destination.adopt(replacement);
    expect(destination.has(replacement)).toBe(true);
    expect(() => destination.adopt(entity)).toThrow(/stale generation/);
  });
});
