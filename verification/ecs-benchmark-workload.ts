import { create_world, define_component, type Entity, type EntityPolicy } from "../src/lib/core/ecs.js";

export type EcsBenchmarkMemory = {
  readonly heap_used_mb: number | null;
  readonly rss_mb: number | null;
};

export type EcsBenchmarkOptions = {
  readonly entity_count: number;
  readonly structural_sample: number;
  readonly snapshot_count: number;
  readonly read_memory: () => EcsBenchmarkMemory;
  readonly collect_garbage?: () => void;
};

export type EcsBenchmarkResult = {
  readonly policy: EntityPolicy;
  readonly entity_count: number;
  readonly structural_sample: number;
  readonly snapshot_count: number;
  readonly position_sum: number;
  readonly dense_query_count: number;
  readonly sparse_query_count: number;
  readonly creation_ms: number;
  readonly dense_update_ms: number;
  readonly sparse_query_ms: number;
  readonly structural_ms: number;
  readonly snapshot_ms: number;
  readonly clear_ms: number;
  readonly memory: {
    readonly after_creation: EcsBenchmarkMemory;
    readonly before_clear: EcsBenchmarkMemory;
    readonly after_clear: EcsBenchmarkMemory;
  };
};

function elapsed(start: number): number {
  return Number((globalThis.performance.now() - start).toFixed(2));
}

function expected_sparse_count(entity_count: number): number {
  return entity_count < 2 ? 0 : Math.floor((entity_count - 2) / 10) + 1;
}

export function run_ecs_benchmark(policy: EntityPolicy, options: EcsBenchmarkOptions): EcsBenchmarkResult {
  type Position = { x: number; y: number };
  type Velocity = { x: number; y: number };
  type Armor = { value: number };

  const position = define_component<Position>({ name: "position" });
  const velocity = define_component<Velocity>({ name: "velocity" });
  const armor = define_component<Armor>({ name: "armor" });
  const world = create_world({ position, velocity, armor }, { entity_policy: policy });

  const creation_start = globalThis.performance.now();
  for (let index = 0; index < options.entity_count; index += 1) {
    const entity = world.create();
    world.add(entity, position, { x: index, y: 0 });
    if (index % 2 === 0) world.add(entity, velocity, { x: 1, y: 0 });
    if (index % 10 === 1) world.add(entity, armor, { value: index });
  }
  const creation_ms = elapsed(creation_start);
  options.collect_garbage?.();
  const after_creation = options.read_memory();

  let position_sum = 0;
  let dense_query_count = 0;
  const dense_update_start = globalThis.performance.now();
  world
    .query()
    .with(position, velocity)
    .each(({ read, write }) => {
      const current = read(position);
      position_sum += current.x;
      write(position).x = current.x + read(velocity).x;
      dense_query_count += 1;
    });
  const dense_update_ms = elapsed(dense_update_start);

  let sparse_query_count = 0;
  const sparse_query_start = globalThis.performance.now();
  world
    .query()
    .with(armor)
    .without(velocity)
    .each(({ read }) => {
      sparse_query_count += read(armor).value >= 0 ? 1 : 0;
    });
  const sparse_query_ms = elapsed(sparse_query_start);

  const structural_entities: Entity[] = [];
  world
    .query()
    .with(position)
    .each(({ entity }) => {
      if (structural_entities.length < options.structural_sample) structural_entities.push(entity);
    });
  const structural_start = globalThis.performance.now();
  for (const entity of structural_entities) world.remove(entity, position);
  for (const entity of structural_entities) world.add(entity, position, { x: entity, y: 1 });
  const structural_ms = elapsed(structural_start);

  const snapshot_position = define_component<Position>({ name: "snapshot_position" });
  const snapshot_source = create_world({ snapshot_position }, { entity_policy: policy });
  for (let index = 0; index < options.snapshot_count; index += 1) {
    const entity = snapshot_source.create();
    snapshot_source.add(entity, snapshot_position, { x: index, y: index + 1 });
  }
  const snapshot_destination = create_world({ snapshot_position }, { entity_policy: policy });
  const snapshot_start = globalThis.performance.now();
  snapshot_destination.import(snapshot_source.export());
  const snapshot_ms = elapsed(snapshot_start);

  options.collect_garbage?.();
  const before_clear = options.read_memory();
  const clear_start = globalThis.performance.now();
  world.clear();
  const clear_ms = elapsed(clear_start);
  snapshot_source.clear();
  snapshot_destination.clear();
  options.collect_garbage?.();
  const after_clear = options.read_memory();

  if (dense_query_count !== Math.ceil(options.entity_count / 2)) {
    throw new Error(`ECS dense query count was ${dense_query_count}, expected ${Math.ceil(options.entity_count / 2)}`);
  }
  if (sparse_query_count !== expected_sparse_count(options.entity_count)) {
    throw new Error(`ECS sparse query count was ${sparse_query_count}, expected ${expected_sparse_count(options.entity_count)}`);
  }

  return {
    policy,
    entity_count: options.entity_count,
    structural_sample: options.structural_sample,
    snapshot_count: options.snapshot_count,
    position_sum,
    dense_query_count,
    sparse_query_count,
    creation_ms,
    dense_update_ms,
    sparse_query_ms,
    structural_ms,
    snapshot_ms,
    clear_ms,
    memory: { after_creation, before_clear, after_clear },
  };
}
