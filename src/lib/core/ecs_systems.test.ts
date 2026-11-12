import { describe, expect, it } from "vitest";
import { create_ecs_system_pipeline } from "./ecs_systems.js";
import { create_world, define_component } from "./ecs.js";
import type { UpdateTime } from "./runtime/timing.js";

type Position = { x: number };

const position = define_component<Position>({ name: "position" });
type PositionSchema = { position: typeof position };

const time: UpdateTime = Object.freeze({
  delta_seconds: 0.1,
  elapsed_seconds: 0.1,
  update_index: 0,
  measured_delta_seconds: 0.1,
  delta_was_clamped: false,
  discarded_seconds: 0,
});

describe("[ecs-system-composition] caller-owned pipeline", () => {
  it("runs enabled systems in declaration order with one timing snapshot", () => {
    const world = create_world({ position });
    const entity = world.create();
    world.add(entity, position, { x: 0 });
    const events: string[] = [];
    const contexts: unknown[] = [];
    const pipeline = create_ecs_system_pipeline<PositionSchema>([
      {
        update: (context) => {
          events.push("first");
          contexts.push(context.time);
          context.world.write(entity, position).x += 1;
        },
      },
      {
        enabled: (context) => context.time.delta_seconds > 0,
        update: (context) => {
          events.push("second");
          contexts.push(context.time);
          context.world.write(entity, position).x += 1;
        },
      },
      { enabled: false, update: () => events.push("disabled") },
    ]);

    pipeline.run(world, time);

    expect(events).toEqual(["first", "second"]);
    expect(contexts[0]).toBe(time);
    expect(contexts[1]).toBe(time);
    expect(world.read(entity, position)).toEqual({ x: 2 });
    expect(pipeline.size).toBe(3);
  });

  it("isolates worlds and preserves deferred structural mutation", () => {
    const first_world = create_world({ position });
    const second_world = create_world({ position });
    const first_entity = first_world.create();
    const second_entity = second_world.create();
    first_world.add(first_entity, position, { x: 1 });
    second_world.add(second_entity, position, { x: 10 });
    const pipeline = create_ecs_system_pipeline<PositionSchema>([
      {
        update: ({ world }) => {
          world
            .query()
            .with(position)
            .each(({ entity, remove }) => {
              if (entity === first_entity) remove(position);
            });
        },
      },
      {
        update: ({ world }) => {
          world
            .query()
            .with(position)
            .each(({ write }) => {
              write(position).x += 1;
            });
        },
      },
    ]);

    pipeline.run(first_world, time);
    pipeline.run(second_world, time);

    expect(first_world.query().with(position).toArray()).toHaveLength(0);
    expect(second_world.read(second_entity, position)).toEqual({ x: 11 });
  });

  it("propagates failures without running later systems", () => {
    const world = create_world({ position });
    const events: string[] = [];
    const pipeline = create_ecs_system_pipeline<PositionSchema>([
      {
        update: () => {
          events.push("failed");
          throw new Error("system failed");
        },
      },
      { update: () => events.push("unreachable") },
    ]);

    expect(() => {
      pipeline.run(world, time);
    }).toThrow("system failed");
    expect(events).toEqual(["failed"]);
  });
});
