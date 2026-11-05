import { beforeEach, describe, expect, it, vi } from "vitest";
import { entity_component_system } from "./ecs.js";

describe("entity component system", () => {
  const ecs = entity_component_system();

  beforeEach(() => {
    ecs.clear();
  });

  it("creates entities and manages their components", () => {
    const entity = ecs.create();
    const update = vi.fn();
    const gametime = { type: "gametime", update } satisfies { type: "gametime"; update: (delta: number) => void };

    ecs.addComponent(entity, gametime);

    expect(ecs.get(entity)).toMatchObject({ entity, gametime });
    expect(ecs.query("gametime")).toEqual([ecs.get(entity)]);

    ecs.removeComponent(entity, "gametime");
    expect(ecs.query("gametime")).toEqual([]);
  });

  it("deletes individual entities and clears all entities", () => {
    const first = ecs.create();
    const second = ecs.create();

    ecs.delete(first);
    expect(() => ecs.get(first)).toThrow();
    expect(ecs.get(second).entity).toBe(second);

    ecs.clear();
    expect(() => ecs.get(second)).toThrow();
  });
});
