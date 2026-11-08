/** A numeric entity handle. The active world decides its identity policy. */
export type Entity = number;

export type EntityPolicy = "monotonic" | "generational";

export type WorldOptions = {
  readonly entity_policy?: EntityPolicy;
};

type ComponentValue = object;

type SnapshotEntry = {
  readonly entity: Entity;
  readonly value: ComponentValue;
};

type ComponentStorage = {
  get(entity: Entity): ComponentValue | undefined;
  set(entity: Entity, value: ComponentValue): void;
  remove(entity: Entity): void;
  has(entity: Entity): boolean;
  entities(): readonly Entity[];
};

type ComponentRuntime = {
  readonly storage_for: (world_key: object) => ComponentStorage;
  readonly restore: (world_key: object, entry: SnapshotEntry) => void;
  readonly snapshot: (world_key: object) => readonly SnapshotEntry[];
};

const component_token_brand = Symbol("squander.component_token_brand");
const component_runtime = Symbol("squander.component_runtime");

export type ComponentToken<Value extends ComponentValue, Name extends string = string> = {
  readonly name: Name;
  readonly [component_token_brand]: (value: Value) => void;
  readonly [component_runtime]: ComponentRuntime;
};

type ErasedComponentToken = ComponentToken<never>;

export type ComponentSchema = Readonly<Record<string, ErasedComponentToken>>;

export type SchemaToken<Schema extends ComponentSchema> = Schema[keyof Schema];

export type ValueOf<Token> = Token extends ComponentToken<infer Value> ? Value : never;

export type WorldSnapshot<Schema extends ComponentSchema> = {
  readonly format_version: 1;
  readonly entity_policy: EntityPolicy;
  readonly entities: readonly Entity[];
  readonly components: Readonly<Record<string, readonly SnapshotEntry[]>>;
  readonly __schema?: Schema;
};

type QuerySnapshot<Token extends ErasedComponentToken> = {
  readonly entity: Entity;
  readonly read: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
};

type ComponentTokenOptions<Name extends string> = {
  readonly name: Name;
};

type MatchCallback<Schema extends ComponentSchema, Token extends ErasedComponentToken> = (match: QueryMatch<Schema, Token>) => void;

export type QueryMatch<Schema extends ComponentSchema, Token extends ErasedComponentToken> = {
  readonly entity: Entity;
  readonly read: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
  readonly write: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
  readonly add: <Requested extends SchemaToken<Schema>>(component: Requested, value: ValueOf<Requested>) => void;
  readonly remove: (component: SchemaToken<Schema>) => void;
  readonly destroy: () => void;
};

export type Query<Schema extends ComponentSchema, Included extends readonly ErasedComponentToken[]> = {
  readonly with: <Added extends readonly SchemaToken<Schema>[]>(...components: Added) => Query<Schema, [...Included, ...Added]>;
  readonly without: (...components: readonly SchemaToken<Schema>[]) => Query<Schema, Included>;
  readonly each: (callback: MatchCallback<Schema, Included[number]>) => void;
  readonly toArray: () => readonly QueryMatch<Schema, Included[number]>[];
  readonly toSnapshots: () => readonly QuerySnapshot<Included[number]>[];
};

export type World<Schema extends ComponentSchema> = {
  readonly schema: Schema;
  readonly entity_policy: EntityPolicy;
  readonly create: () => Entity;
  readonly adopt: (entity: Entity) => Entity;
  readonly has: (entity: Entity) => boolean;
  readonly destroy: (entity: Entity) => void;
  readonly clear: () => void;
  readonly add: <Token extends SchemaToken<Schema>>(entity: Entity, component: Token, value: ValueOf<Token>) => void;
  readonly remove: (entity: Entity, component: SchemaToken<Schema>) => void;
  readonly get: <Token extends SchemaToken<Schema>>(entity: Entity, component: Token) => ValueOf<Token> | undefined;
  readonly read: <Token extends SchemaToken<Schema>>(entity: Entity, component: Token) => ValueOf<Token>;
  readonly write: <Token extends SchemaToken<Schema>>(entity: Entity, component: Token) => ValueOf<Token>;
  readonly query: () => Query<Schema, []>;
  readonly export: () => WorldSnapshot<Schema>;
  readonly import: (snapshot: WorldSnapshot<Schema>) => void;
};

const generational_base = 2 ** 26;
const generational_max_slot = generational_base - 1;
const generational_max_generation = generational_base - 1;

type GenerationalParts = {
  readonly slot: number;
  readonly generation: number;
};

class DenseStorage implements ComponentStorage {
  private readonly dense_entities: Entity[] = [];
  private readonly dense_values: ComponentValue[] = [];
  private readonly sparse_indices = new Map<Entity, number>();

  get(entity: Entity): ComponentValue | undefined {
    const index = this.sparse_indices.get(entity);
    return index === undefined ? undefined : this.dense_values[index];
  }

  set(entity: Entity, value: ComponentValue): void {
    const index = this.sparse_indices.get(entity);
    if (index === undefined) {
      this.sparse_indices.set(entity, this.dense_entities.length);
      this.dense_entities.push(entity);
      this.dense_values.push(value);
      return;
    }

    this.dense_values[index] = value;
  }

  remove(entity: Entity): void {
    const index = this.sparse_indices.get(entity);
    if (index === undefined) return;

    const last_index = this.dense_entities.length - 1;
    const last_entity = this.dense_entities[last_index];
    const last_value = this.dense_values[last_index];
    if (index !== last_index) {
      this.dense_entities[index] = last_entity;
      this.dense_values[index] = last_value;
      this.sparse_indices.set(last_entity, index);
    }

    this.dense_entities.pop();
    this.dense_values.pop();
    this.sparse_indices.delete(entity);
  }

  has(entity: Entity): boolean {
    return this.sparse_indices.has(entity);
  }

  entities(): readonly Entity[] {
    return this.dense_entities;
  }
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function is_component_value(value: unknown): value is ComponentValue {
  return typeof value === "object" && value !== null;
}

function is_value_for_token<Token extends ErasedComponentToken>(
  _component: Token,
  value: ComponentValue | undefined,
): value is ValueOf<Token> {
  return value !== undefined;
}

function is_entity(value: unknown): value is Entity {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function is_entity_policy(value: unknown): value is EntityPolicy {
  return value === "monotonic" || value === "generational";
}

function decode_generational_entity(entity: unknown): GenerationalParts | undefined {
  if (!is_entity(entity)) return undefined;
  const slot = Math.floor(entity / generational_base);
  const generation = entity % generational_base;
  if (slot < 1 || slot > generational_max_slot || generation < 1 || generation > generational_max_generation) return undefined;
  return { slot, generation };
}

function encode_generational_entity(slot: number, generation: number): Entity {
  return slot * generational_base + generation;
}

function is_entity_for_policy(value: unknown, policy: EntityPolicy): value is Entity {
  return policy === "monotonic" ? is_entity(value) : decode_generational_entity(value) !== undefined;
}

function is_snapshot_entry(value: unknown): value is SnapshotEntry {
  if (!is_record(value)) return false;
  return is_entity(value.entity) && is_component_value(value.value);
}

function is_world_snapshot(value: unknown): value is WorldSnapshot<ComponentSchema> {
  if (!is_record(value)) return false;
  const format_version = value.format_version;
  const entity_policy = value.entity_policy;
  const entities = value.entities;
  const components = value.components;
  if (format_version !== 1 || !is_entity_policy(entity_policy)) return false;
  if (!Array.isArray(entities) || !entities.every(is_entity)) return false;
  if (!is_record(components)) return false;
  return Object.values(components).every((entries) => Array.isArray(entries) && entries.every(is_snapshot_entry));
}

function clone_component_value(value: ComponentValue, component_name: string): ComponentValue {
  try {
    return structuredClone(value);
  } catch {
    throw new Error(`ECS component "${component_name}" contains a non-structured-cloneable value`);
  }
}

let next_entity_id = 0;

export function define_component<Value extends ComponentValue, Name extends string = string>(
  options: ComponentTokenOptions<Name>,
): ComponentToken<Value, Name> {
  const storages = new WeakMap<object, DenseStorage>();
  const storage_for = (world_key: object): DenseStorage => {
    const existing = storages.get(world_key);
    if (existing !== undefined) return existing;

    const storage = new DenseStorage();
    storages.set(world_key, storage);
    return storage;
  };

  const runtime: ComponentRuntime = {
    storage_for,
    restore: (world_key, entry) => {
      storage_for(world_key).set(entry.entity, entry.value);
    },
    snapshot: (world_key) => {
      const storage = storage_for(world_key);
      return storage.entities().map((entity) => {
        const value = storage.get(entity);
        if (value === undefined) throw new Error(`ECS component "${options.name}" has a missing value`);
        return { entity, value: clone_component_value(value, options.name) };
      });
    },
  };

  const token: ComponentToken<Value, Name> = {
    name: options.name,
    [component_token_brand]: (_value: Value) => undefined,
    [component_runtime]: runtime,
  };

  return token;
}

export function define_components<const Schema extends ComponentSchema>(schema: Schema): Schema {
  return schema;
}

class WorldImplementation<Schema extends ComponentSchema> implements World<Schema> {
  readonly schema: Schema;
  readonly entity_policy: EntityPolicy;
  private readonly world_key = {};
  private readonly entities = new Set<Entity>();
  private readonly components_by_name = new Map<string, ErasedComponentToken>();
  private readonly pending_operations: (() => void)[] = [];
  private readonly generational_generations = new Map<number, number>();
  private readonly free_generational_slots: number[] = [];
  private iteration_depth = 0;
  private next_generational_slot = 1;

  constructor(schema: Schema, options: WorldOptions = {}) {
    this.schema = schema;
    this.entity_policy = options.entity_policy ?? "monotonic";
    for (const component of Object.values(schema)) {
      if (this.components_by_name.has(component.name)) {
        throw new Error(`ECS component name "${component.name}" is registered more than once`);
      }
      this.components_by_name.set(component.name, component);
    }
  }

  create(): Entity {
    if (this.entity_policy === "monotonic") {
      if (next_entity_id >= Number.MAX_SAFE_INTEGER) throw new Error("ECS entity ID range is exhausted");
      const entity = ++next_entity_id;
      this.entities.add(entity);
      return entity;
    }

    const slot = this.free_generational_slots.pop() ?? this.next_generational_slot++;
    if (slot > generational_max_slot) throw new Error("ECS generational entity slot range is exhausted");
    const generation = this.generational_generations.get(slot) ?? 1;
    const entity = encode_generational_entity(slot, generation);
    this.entities.add(entity);
    this.generational_generations.set(slot, generation);
    return entity;
  }

  adopt(entity: Entity): Entity {
    if (!is_entity_for_policy(entity, this.entity_policy)) {
      throw new Error(`ECS entity "${String(entity)}" is not valid for ${this.entity_policy} identity policy`);
    }

    if (this.entity_policy === "monotonic") {
      if (entity > next_entity_id) next_entity_id = entity;
    } else {
      const parts = decode_generational_entity(entity);
      if (parts === undefined) throw new Error(`ECS entity "${String(entity)}" has an invalid generation handle`);
      const current_generation = this.generational_generations.get(parts.slot);
      if (current_generation !== undefined && current_generation !== parts.generation) {
        throw new Error(`ECS entity "${String(entity)}" has a stale generation`);
      }
      this.generational_generations.set(parts.slot, parts.generation);
      if (parts.slot >= this.next_generational_slot) this.next_generational_slot = parts.slot + 1;
      const free_index = this.free_generational_slots.indexOf(parts.slot);
      if (free_index >= 0) this.free_generational_slots.splice(free_index, 1);
    }

    this.entities.add(entity);
    return entity;
  }

  has(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  destroy(entity: Entity): void {
    this.assert_entity(entity);
    this.defer_or_run(() => {
      this.entities.delete(entity);
      if (this.entity_policy === "generational") this.release_generational_entity(entity);
      for (const component of Object.values(this.schema)) this.runtime_for(component).storage_for(this.world_key).remove(entity);
    });
  }

  clear(): void {
    this.defer_or_run(() => {
      const existing_entities = [...this.entities];
      this.entities.clear();
      if (this.entity_policy === "generational") this.reset_generational_slots();
      for (const component of Object.values(this.schema)) {
        const storage = this.runtime_for(component).storage_for(this.world_key);
        for (const entity of existing_entities) storage.remove(entity);
      }
    });
  }

  add<Token extends SchemaToken<Schema>>(entity: Entity, component: Token, value: ValueOf<Token>): void {
    this.assert_entity(entity);
    this.assert_component(component);
    this.defer_or_run(() => {
      if (!this.entities.has(entity)) return;
      this.runtime_for(component).storage_for(this.world_key).set(entity, value);
    });
  }

  remove(entity: Entity, component: SchemaToken<Schema>): void {
    this.assert_entity(entity);
    this.assert_component(component);
    this.defer_or_run(() => {
      if (!this.entities.has(entity)) return;
      this.runtime_for(component).storage_for(this.world_key).remove(entity);
    });
  }

  get<Token extends ErasedComponentToken>(entity: Entity, component: Token): ValueOf<Token> | undefined {
    this.assert_entity(entity);
    this.assert_component(component);
    const value = this.runtime_for(component).storage_for(this.world_key).get(entity);
    return is_value_for_token(component, value) ? value : undefined;
  }

  read<Token extends ErasedComponentToken>(entity: Entity, component: Token): ValueOf<Token> {
    const value = this.get(entity, component);
    if (value === undefined) throw new Error(`ECS entity "${String(entity)}" does not have component "${component.name}"`);
    return value;
  }

  write<Token extends ErasedComponentToken>(entity: Entity, component: Token): ValueOf<Token> {
    return this.read(entity, component);
  }

  query(): Query<Schema, []> {
    return new QueryImplementation<Schema, []>(this);
  }

  export(): WorldSnapshot<Schema> {
    const components: Record<string, readonly SnapshotEntry[]> = {};
    for (const component of Object.values(this.schema)) {
      components[component.name] = this.runtime_for(component).snapshot(this.world_key);
    }
    return { format_version: 1, entity_policy: this.entity_policy, entities: Array.from(this.entities), components };
  }

  import(snapshot: WorldSnapshot<Schema>): void {
    if (this.iteration_depth > 0) throw new Error("ECS cannot import during query iteration");
    if (!is_world_snapshot(snapshot)) throw new Error("ECS snapshot is malformed");
    if (snapshot.entity_policy !== this.entity_policy) {
      throw new Error(`ECS snapshot uses ${snapshot.entity_policy} identity policy, expected ${this.entity_policy}`);
    }

    const imported_entities = new Set(snapshot.entities);
    if (imported_entities.size !== snapshot.entities.length) throw new Error("ECS snapshot contains entity IDs more than once");
    for (const entity of imported_entities) {
      if (!is_entity_for_policy(entity, this.entity_policy)) {
        throw new Error(`ECS snapshot contains an invalid ${this.entity_policy} entity "${String(entity)}"`);
      }
    }

    const prepared_components: { readonly component: ErasedComponentToken; readonly entries: readonly SnapshotEntry[] }[] = [];
    for (const [name, entries] of Object.entries(snapshot.components)) {
      const component = this.components_by_name.get(name);
      if (component === undefined) throw new Error(`ECS snapshot contains unknown component "${name}"`);

      const seen_entities = new Set<Entity>();
      const prepared_entries = entries.map((entry) => {
        if (!imported_entities.has(entry.entity)) {
          throw new Error(`ECS snapshot component "${name}" references unknown entity "${String(entry.entity)}"`);
        }
        if (seen_entities.has(entry.entity)) {
          throw new Error(`ECS snapshot component "${name}" contains entity "${String(entry.entity)}" more than once`);
        }
        seen_entities.add(entry.entity);
        return { entity: entry.entity, value: clone_component_value(entry.value, name) };
      });
      prepared_components.push({ component, entries: prepared_entries });
    }

    this.replace_entity_state(imported_entities);
    for (const prepared of prepared_components) {
      for (const entry of prepared.entries) this.runtime_for(prepared.component).restore(this.world_key, entry);
    }
  }

  begin_iteration(): void {
    this.iteration_depth += 1;
  }

  end_iteration(): void {
    this.iteration_depth -= 1;
    if (this.iteration_depth !== 0) return;
    const operations = this.pending_operations.splice(0);
    for (const operation of operations) operation();
  }

  matching_entities(components: readonly ErasedComponentToken[], excluded: readonly ErasedComponentToken[]): readonly Entity[] {
    for (const component of [...components, ...excluded]) this.assert_component(component);
    const source = this.smallest_storage(components);
    const candidates = source === undefined ? Array.from(this.entities) : this.runtime_for(source).storage_for(this.world_key).entities();
    return candidates.filter((entity) => {
      return (
        this.entities.has(entity) &&
        components.every((component) => this.runtime_for(component).storage_for(this.world_key).has(entity)) &&
        excluded.every((component) => !this.runtime_for(component).storage_for(this.world_key).has(entity))
      );
    });
  }

  storage_key(): object {
    return this.world_key;
  }

  runtime_for(component: ErasedComponentToken): ComponentRuntime {
    return component[component_runtime];
  }

  private smallest_storage(components: readonly ErasedComponentToken[]): ErasedComponentToken | undefined {
    let smallest: ErasedComponentToken | undefined;
    let smallest_size = Number.POSITIVE_INFINITY;
    for (const component of components) {
      const size = this.runtime_for(component).storage_for(this.world_key).entities().length;
      if (size < smallest_size) {
        smallest = component;
        smallest_size = size;
      }
    }
    return smallest;
  }

  private assert_entity(entity: Entity): void {
    if (!is_entity_for_policy(entity, this.entity_policy) || !this.entities.has(entity)) {
      throw new Error(`ECS entity "${String(entity)}" does not belong to this world`);
    }
  }

  private assert_component(component: ErasedComponentToken): void {
    const registered = this.components_by_name.get(component.name);
    if (registered !== component) throw new Error(`ECS component "${component.name}" does not belong to this world`);
  }

  private defer_or_run(operation: () => void): void {
    if (this.iteration_depth > 0) {
      this.pending_operations.push(operation);
      return;
    }
    operation();
  }

  private release_generational_entity(entity: Entity): void {
    const parts = decode_generational_entity(entity);
    if (parts === undefined) return;
    const current_generation = this.generational_generations.get(parts.slot);
    if (current_generation !== parts.generation) return;
    if (parts.generation === generational_max_generation) return;
    const next_generation = parts.generation + 1;
    this.generational_generations.set(parts.slot, next_generation);
    this.free_generational_slots.push(parts.slot);
  }

  private reset_generational_slots(): void {
    this.free_generational_slots.length = 0;
    for (const [slot, generation] of this.generational_generations) {
      if (generation === generational_max_generation) continue;
      const next_generation = generation + 1;
      this.generational_generations.set(slot, next_generation);
      this.free_generational_slots.push(slot);
    }
  }

  private replace_entity_state(imported_entities: ReadonlySet<Entity>): void {
    const existing_entities = [...this.entities];
    this.entities.clear();
    for (const component of Object.values(this.schema)) {
      const storage = this.runtime_for(component).storage_for(this.world_key);
      for (const entity of existing_entities) storage.remove(entity);
    }

    if (this.entity_policy === "monotonic") {
      for (const entity of imported_entities) {
        this.entities.add(entity);
        if (entity > next_entity_id) next_entity_id = entity;
      }
      return;
    }

    const previous_generations = new Map(this.generational_generations);
    const imported_slots = new Set<number>();
    this.generational_generations.clear();
    this.free_generational_slots.length = 0;
    let highest_slot = this.next_generational_slot;
    for (const entity of imported_entities) {
      const parts = decode_generational_entity(entity);
      if (parts === undefined) throw new Error("ECS snapshot contains an invalid generation handle");
      imported_slots.add(parts.slot);
      this.generational_generations.set(parts.slot, parts.generation);
      highest_slot = Math.max(highest_slot, parts.slot + 1);
      this.entities.add(entity);
    }
    for (const [slot, generation] of previous_generations) {
      if (imported_slots.has(slot) || generation === generational_max_generation) continue;
      const next_generation = generation + 1;
      this.generational_generations.set(slot, next_generation);
      this.free_generational_slots.push(slot);
    }
    this.next_generational_slot = highest_slot;
  }
}

class QueryImplementation<Schema extends ComponentSchema, Included extends readonly ErasedComponentToken[]> implements Query<
  Schema,
  Included
> {
  private readonly included: readonly ErasedComponentToken[];
  private readonly excluded: readonly ErasedComponentToken[];

  constructor(
    private readonly world: WorldImplementation<Schema>,
    included: readonly ErasedComponentToken[] = [],
    excluded: readonly ErasedComponentToken[] = [],
  ) {
    this.included = included;
    this.excluded = excluded;
  }

  with<Added extends readonly SchemaToken<Schema>[]>(...components: Added): Query<Schema, [...Included, ...Added]> {
    return new QueryImplementation<Schema, [...Included, ...Added]>(this.world, [...this.included, ...components], this.excluded);
  }

  without(...components: readonly SchemaToken<Schema>[]): Query<Schema, Included> {
    return new QueryImplementation<Schema, Included>(this.world, this.included, [...this.excluded, ...components]);
  }

  each(callback: MatchCallback<Schema, Included[number]>): void {
    this.world.begin_iteration();
    try {
      for (const entity of this.world.matching_entities(this.included, this.excluded)) callback(this.match(entity));
    } finally {
      this.world.end_iteration();
    }
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Public API uses the documented camelCase query method.
  toArray(): readonly QueryMatch<Schema, Included[number]>[] {
    const matches: QueryMatch<Schema, Included[number]>[] = [];
    this.each((match) => matches.push(match));
    return matches;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Public API uses the documented camelCase query method.
  toSnapshots(): readonly QuerySnapshot<Included[number]>[] {
    const snapshots: QuerySnapshot<Included[number]>[] = [];
    this.each((match) => {
      const values = new Map<ErasedComponentToken, ComponentValue>();
      for (const component of this.included) {
        const storage = this.world.runtime_for(component).storage_for(this.world.storage_key());
        const value = storage.get(match.entity);
        if (value === undefined) throw new Error(`ECS query lost component "${component.name}" during snapshotting`);
        values.set(component, clone_component_value(value, component.name));
      }
      snapshots.push({
        entity: match.entity,
        read: <Requested extends Included[number]>(component: Requested) => {
          const value = values.get(component);
          if (value === undefined) throw new Error(`ECS snapshot is missing component "${component.name}"`);
          if (!is_value_for_token(component, value)) throw new Error(`ECS snapshot has an invalid component value`);
          return value;
        },
      });
    });
    return snapshots;
  }

  private match(entity: Entity): QueryMatch<Schema, Included[number]> {
    return {
      entity,
      read: <Requested extends Included[number]>(component: Requested) => this.world.read(entity, component),
      write: <Requested extends Included[number]>(component: Requested) => this.world.write(entity, component),
      add: <Requested extends SchemaToken<Schema>>(component: Requested, value: ValueOf<Requested>) => {
        this.world.add(entity, component, value);
      },
      remove: (component: SchemaToken<Schema>) => {
        this.world.remove(entity, component);
      },
      destroy: () => {
        this.world.destroy(entity);
      },
    };
  }
}

export function create_world<Schema extends ComponentSchema>(schema: Schema, options?: WorldOptions): World<Schema> {
  return new WorldImplementation(schema, options);
}
