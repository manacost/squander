import { performance } from "node:perf_hooks";
import { describe, it } from "vitest";

type Entity = number;
type Position = { x: number; y: number };

type PositionStore = {
  set: (entity: Entity, value: Position) => void;
  get: (entity: Entity) => Position | undefined;
  remove: (entity: Entity) => void;
  each: (callback: (value: Position) => void) => void;
  clear: () => void;
};

class MapStore implements PositionStore {
  private readonly values = new Map<Entity, Position>();

  set(entity: Entity, value: Position): void {
    this.values.set(entity, value);
  }

  get(entity: Entity): Position | undefined {
    return this.values.get(entity);
  }

  remove(entity: Entity): void {
    this.values.delete(entity);
  }

  each(callback: (value: Position) => void): void {
    for (const value of this.values.values()) callback(value);
  }

  clear(): void {
    this.values.clear();
  }
}

class SparseSetStore implements PositionStore {
  private readonly entities: Entity[] = [];
  private readonly values: Position[] = [];
  private readonly indices = new Map<Entity, number>();

  set(entity: Entity, value: Position): void {
    const index = this.indices.get(entity);
    if (index === undefined) {
      this.indices.set(entity, this.entities.length);
      this.entities.push(entity);
      this.values.push(value);
      return;
    }
    this.values[index] = value;
  }

  get(entity: Entity): Position | undefined {
    const index = this.indices.get(entity);
    return index === undefined ? undefined : this.values[index];
  }

  remove(entity: Entity): void {
    const index = this.indices.get(entity);
    if (index === undefined) return;
    const last_index = this.entities.length - 1;
    const last_entity = this.entities[last_index];
    const last_value = this.values[last_index];
    if (last_entity === undefined || last_value === undefined) return;
    if (index !== last_index) {
      this.entities[index] = last_entity;
      this.values[index] = last_value;
      this.indices.set(last_entity, index);
    }
    this.entities.pop();
    this.values.pop();
    this.indices.delete(entity);
  }

  each(callback: (value: Position) => void): void {
    for (const value of this.values) callback(value);
  }

  clear(): void {
    this.entities.length = 0;
    this.values.length = 0;
    this.indices.clear();
  }
}

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

function measure(name: string, create_store: () => PositionStore): Record<string, unknown> {
  const store = create_store();
  const creation_start = performance.now();
  for (let entity = 1; entity <= entity_count; entity += 1) store.set(entity, { x: entity, y: 0 });
  const creation_ms = elapsed(creation_start);
  const after_creation = memory();

  let position_sum = 0;
  const update_start = performance.now();
  store.each((value) => {
    position_sum += value.x;
    value.x += 1;
  });
  const update_ms = elapsed(update_start);

  const structural_start = performance.now();
  for (let entity = 1; entity <= structural_sample; entity += 1) store.remove(entity);
  for (let entity = 1; entity <= structural_sample; entity += 1) store.set(entity, { x: entity, y: 1 });
  const structural_ms = elapsed(structural_start);

  let query_count = 0;
  const query_start = performance.now();
  store.each((value) => {
    query_count += value.y;
  });
  const query_ms = elapsed(query_start);

  const before_clear = memory();
  const clear_start = performance.now();
  store.clear();
  const clear_ms = elapsed(clear_start);
  const after_clear = memory();

  return {
    name,
    position_sum,
    query_count,
    creation_ms,
    update_ms,
    structural_ms,
    query_ms,
    clear_ms,
    memory: { after_creation, before_clear, after_clear },
  };
}

describe("ecs storage comparison", () => {
  it("measures two object-shaped columns through one workload", () => {
    console.log(
      JSON.stringify({
        runtime: process.version,
        entity_count,
        structural_sample,
        strategies: [measure("sparse-set", () => new SparseSetStore()), measure("object-map", () => new MapStore())],
      }),
    );
  }, 180_000);
});
