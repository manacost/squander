import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { create_world, define_component } from "../src/lib/core/ecs.js";

type Position = { x: number; y: number };

const entity_count = 1_000_000;
const structural_sample = 100_000;

function elapsed(start: number): number {
  return Number((performance.now() - start).toFixed(2));
}

function memory(): { heap_used_mb: number; rss_mb: number } {
  const usage = process.memoryUsage();
  return {
    heap_used_mb: Number((usage.heapUsed / 1024 / 1024).toFixed(1)),
    rss_mb: Number((usage.rss / 1024 / 1024).toFixed(1)),
  };
}

describe("ecs million-entity benchmark", () => {
  it("records the object-first sparse-set workload", () => {
    const position = define_component<Position>({ name: "position" });
    const world = create_world({ position });

    const creation_start = performance.now();
    for (let index = 0; index < entity_count; index += 1) {
      const entity = world.create();
      world.add(entity, position, { x: index, y: 0 });
    }
    const creation_ms = elapsed(creation_start);
    const after_creation = memory();

    let position_sum = 0;
    const update_start = performance.now();
    world
      .query()
      .with(position)
      .each(({ read, write }) => {
        const current = read(position);
        position_sum += current.x;
        write(position).x = current.x + 1;
      });
    const update_ms = elapsed(update_start);

    const structural_start = performance.now();
    const structural_entities = world
      .query()
      .with(position)
      .toArray()
      .slice(0, structural_sample)
      .map((match) => match.entity);
    for (const entity of structural_entities) world.remove(entity, position);
    for (const entity of structural_entities) world.add(entity, position, { x: entity, y: 1 });
    const structural_ms = elapsed(structural_start);

    const query_start = performance.now();
    let query_count = 0;
    world
      .query()
      .with(position)
      .each(({ read }) => {
        query_count += read(position).y;
      });
    const query_ms = elapsed(query_start);

    const before_clear = memory();
    const clear_start = performance.now();
    world.clear();
    const clear_ms = elapsed(clear_start);
    const after_clear = memory();

    console.log(
      JSON.stringify({
        runtime: process.version,
        entity_count,
        structural_sample,
        position_sum,
        query_count,
        creation_ms,
        update_ms,
        structural_ms,
        query_ms,
        clear_ms,
        memory: { after_creation, before_clear, after_clear },
      }),
    );
    expect(query_count).toBe(structural_sample);
    expect(position_sum).toBe((entity_count * (entity_count - 1)) / 2);
  }, 180_000);
});
