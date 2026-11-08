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
  });
});
