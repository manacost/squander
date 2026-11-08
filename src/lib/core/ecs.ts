/** A cheap entity handle. Entity IDs are never reused by the module. */
export type Entity = number;

type ComponentValue = object;

type ComponentStorage<Value extends ComponentValue> = {
  get(entity: Entity): Value | undefined;
  set(entity: Entity, value: Value): void;
  remove(entity: Entity): void;
  has(entity: Entity): boolean;
  entities(): readonly Entity[];
  clone(value: Value): Value;
};

type SnapshotEntry = {
  readonly entity: Entity;
  readonly value: ComponentValue;
};

export type ComponentToken<Value extends ComponentValue, Name extends string = string> = {
  readonly name: Name;
  readonly component_id: symbol;
  get_storage(world_key: object): ComponentStorage<Value>;
  restore(world_key: object, entry: SnapshotEntry): void;
  snapshot(world_key: object): readonly SnapshotEntry[];
};

type ErasedComponentToken = ComponentToken<ComponentValue>;

export type ComponentSchema = Readonly<Record<string, ComponentToken<ComponentValue>>>;

export type SchemaToken<Schema extends ComponentSchema> = ComponentToken<ComponentValue> & Schema[keyof Schema];

export type ValueOf<Token> = Token extends ComponentToken<infer Value> ? Value : never;

export type WorldSnapshot<Schema extends ComponentSchema> = {
  readonly entities: readonly Entity[];
  readonly components: Readonly<Record<string, readonly SnapshotEntry[]>>;
  readonly __schema?: Schema;
};

type QuerySnapshot<Token extends ComponentToken<ComponentValue>> = {
  readonly entity: Entity;
  readonly read: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
};

type ComponentTokenOptions<Name extends string> = {
  readonly name: Name;
};

type MatchCallback<Schema extends ComponentSchema, Token extends ComponentToken<ComponentValue>> = (
  match: QueryMatch<Schema, Token>,
) => void;

export type QueryMatch<Schema extends ComponentSchema, Token extends ComponentToken<ComponentValue>> = {
  readonly entity: Entity;
  readonly read: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
  readonly write: <Requested extends Token>(component: Requested) => ValueOf<Requested>;
  readonly add: <Requested extends SchemaToken<Schema>>(component: Requested, value: ValueOf<Requested>) => void;
  readonly remove: (component: SchemaToken<Schema>) => void;
  readonly destroy: () => void;
};

export type Query<Schema extends ComponentSchema, Included extends readonly SchemaToken<Schema>[]> = {
  readonly with: <Added extends readonly SchemaToken<Schema>[]>(...components: Added) => Query<Schema, [...Included, ...Added]>;
  readonly without: (...components: readonly SchemaToken<Schema>[]) => Query<Schema, Included>;
  readonly each: (callback: MatchCallback<Schema, Included[number]>) => void;
  readonly toArray: () => readonly QueryMatch<Schema, Included[number]>[];
  readonly toSnapshots: () => readonly QuerySnapshot<Included[number]>[];
};

export type World<Schema extends ComponentSchema> = {
  readonly schema: Schema;
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

class DenseStorage<Value extends ComponentValue> implements ComponentStorage<Value> {
  private readonly dense_entities: Entity[] = [];
  private readonly dense_values: Value[] = [];
  private readonly sparse_indices = new Map<Entity, number>();

  get(entity: Entity): Value | undefined {
    const index = this.sparse_indices.get(entity);
    return index === undefined ? undefined : this.dense_values[index];
  }

  set(entity: Entity, value: Value): void {
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

  clone(value: Value): Value {
    return structuredClone(value);
  }
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function is_component_value(value: unknown): value is ComponentValue {
  return typeof value === "object" && value !== null;
}

function is_value_for_token<Token extends ComponentToken<ComponentValue>>(
  _component: Token,
  value: ComponentValue | undefined,
): value is ValueOf<Token> {
  return value !== undefined;
}

function is_entity(value: unknown): value is Entity {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function is_snapshot_entry(value: unknown): value is SnapshotEntry {
  if (!is_record(value)) return false;
  return is_entity(value.entity) && is_component_value(value.value);
}

function is_world_snapshot(value: unknown): value is WorldSnapshot<ComponentSchema> {
  if (!is_record(value)) return false;
  const entities = value.entities;
  const components = value.components;
  if (!Array.isArray(entities) || !entities.every(is_entity)) return false;
  if (!is_record(components)) return false;
  return Object.values(components).every((entries) => Array.isArray(entries) && entries.every(is_snapshot_entry));
}

let next_entity_id = 0;

export function define_component<Value extends ComponentValue, Name extends string = string>(
  options: ComponentTokenOptions<Name>,
): ComponentToken<Value, Name> {
  const storages = new WeakMap<object, DenseStorage<Value>>();
  const component_id = Symbol(options.name);
  const get_storage = (world_key: object): DenseStorage<Value> => {
    const existing = storages.get(world_key);
    if (existing !== undefined) return existing;

    const storage = new DenseStorage<Value>();
    storages.set(world_key, storage);
    return storage;
  };
  const is_value = (_value: ComponentValue): _value is Value => true;

  const token: ComponentToken<Value, Name> = {
    name: options.name,
    component_id,
    get_storage,
    restore: (world_key, entry) => {
      if (!is_value(entry.value)) {
        throw new Error(`ECS component "${options.name}" must contain an object value`);
      }
      get_storage(world_key).set(entry.entity, entry.value);
    },
    snapshot: (world_key) => {
      const storage = get_storage(world_key);
      return storage.entities().map((entity) => {
        const value = storage.get(entity);
        if (value === undefined) throw new Error(`ECS component "${options.name}" has a missing value`);
        return { entity, value: storage.clone(value) };
      });
    },
  };

  return token;
}

export function define_components<const Schema extends ComponentSchema>(schema: Schema): Schema {
  return schema;
}

class WorldImplementation<Schema extends ComponentSchema> implements World<Schema> {
  readonly schema: Schema;
  private readonly world_key = {};
  private readonly entities = new Set<Entity>();
  private readonly components_by_name = new Map<string, ErasedComponentToken>();
  private readonly pending_operations: (() => void)[] = [];
  private iteration_depth = 0;

  constructor(schema: Schema) {
    this.schema = schema;
    for (const component of Object.values(schema)) {
      if (this.components_by_name.has(component.name)) {
        throw new Error(`ECS component name "${component.name}" is registered more than once`);
      }
      this.components_by_name.set(component.name, component);
    }
  }

  create(): Entity {
    if (next_entity_id === Number.MAX_SAFE_INTEGER) throw new Error("ECS entity ID range is exhausted");
    const entity = ++next_entity_id;
    this.entities.add(entity);
    return entity;
  }

  adopt(entity: Entity): Entity {
    if (!is_entity(entity)) throw new Error(`ECS entity "${String(entity)}" is not a valid numeric entity ID`);
    if (entity > next_entity_id) next_entity_id = entity;
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
      for (const component of Object.values(this.schema)) component.get_storage(this.world_key).remove(entity);
    });
  }

  clear(): void {
    this.defer_or_run(() => {
      this.entities.clear();
      for (const component of Object.values(this.schema)) {
        const storage = component.get_storage(this.world_key);
        for (const entity of [...storage.entities()]) storage.remove(entity);
      }
    });
  }

  add<Token extends SchemaToken<Schema>>(entity: Entity, component: Token, value: ValueOf<Token>): void {
    this.assert_entity(entity);
    this.assert_component(component);
    this.defer_or_run(() => {
      if (!this.entities.has(entity)) return;
      component.get_storage(this.world_key).set(entity, value);
    });
  }

  remove(entity: Entity, component: SchemaToken<Schema>): void {
    this.assert_entity(entity);
    this.assert_component(component);
    this.defer_or_run(() => {
      if (!this.entities.has(entity)) return;
      component.get_storage(this.world_key).remove(entity);
    });
  }

  get<Token extends SchemaToken<Schema>>(entity: Entity, component: Token): ValueOf<Token> | undefined {
    this.assert_entity(entity);
    this.assert_component(component);
    const value = component.get_storage(this.world_key).get(entity);
    return is_value_for_token(component, value) ? value : undefined;
  }

  read<Token extends SchemaToken<Schema>>(entity: Entity, component: Token): ValueOf<Token> {
    const value = this.get(entity, component);
    if (value === undefined) throw new Error(`ECS entity "${String(entity)}" does not have component "${component.name}"`);
    return value;
  }

  write<Token extends SchemaToken<Schema>>(entity: Entity, component: Token): ValueOf<Token> {
    return this.read(entity, component);
  }

  query(): Query<Schema, []> {
    return new QueryImplementation<Schema, []>(this);
  }

  export(): WorldSnapshot<Schema> {
    const components: Record<string, readonly SnapshotEntry[]> = {};
    for (const component of Object.values(this.schema)) {
      components[component.name] = component.snapshot(this.world_key);
    }
    return { entities: Array.from(this.entities), components };
  }

  import(snapshot: WorldSnapshot<Schema>): void {
    if (!is_world_snapshot(snapshot)) throw new Error("ECS snapshot is malformed");

    const imported_entities = new Set(snapshot.entities);
    for (const [name, entries] of Object.entries(snapshot.components)) {
      const component = this.components_by_name.get(name);
      if (component === undefined) throw new Error(`ECS snapshot contains unknown component "${name}"`);

      const seen_entities = new Set<Entity>();
      for (const entry of entries) {
        if (!imported_entities.has(entry.entity)) {
          throw new Error(`ECS snapshot component "${name}" references unknown entity "${String(entry.entity)}"`);
        }
        if (seen_entities.has(entry.entity)) {
          throw new Error(`ECS snapshot component "${name}" contains entity "${String(entry.entity)}" more than once`);
        }
        seen_entities.add(entry.entity);
      }
    }

    this.entities.clear();
    for (const component of Object.values(this.schema)) {
      const storage = component.get_storage(this.world_key);
      for (const entity of [...storage.entities()]) storage.remove(entity);
    }
    for (const entity of imported_entities) this.entities.add(entity);
    for (const [name, entries] of Object.entries(snapshot.components)) {
      const component = this.components_by_name.get(name);
      if (component === undefined) throw new Error(`ECS snapshot contains unknown component "${name}"`);
      for (const entry of entries) component.restore(this.world_key, entry);
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
    const source = this.smallest_storage(components);
    const candidates = source === undefined ? Array.from(this.entities) : source.get_storage(this.world_key).entities();
    return candidates.filter((entity) => {
      return (
        this.entities.has(entity) &&
        components.every((component) => component.get_storage(this.world_key).has(entity)) &&
        excluded.every((component) => !component.get_storage(this.world_key).has(entity))
      );
    });
  }

  storage_key(): object {
    return this.world_key;
  }

  private smallest_storage(components: readonly ErasedComponentToken[]): ErasedComponentToken | undefined {
    let smallest: ErasedComponentToken | undefined;
    let smallest_size = Number.POSITIVE_INFINITY;
    for (const component of components) {
      const size = component.get_storage(this.world_key).entities().length;
      if (size < smallest_size) {
        smallest = component;
        smallest_size = size;
      }
    }
    return smallest;
  }

  private assert_entity(entity: Entity): void {
    if (!this.entities.has(entity)) throw new Error(`ECS entity "${String(entity)}" does not belong to this world`);
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
}

class QueryImplementation<Schema extends ComponentSchema, Included extends readonly SchemaToken<Schema>[]> implements Query<
  Schema,
  Included
> {
  private readonly included: readonly ErasedComponentToken[];
  private readonly excluded: ErasedComponentToken[] = [];

  constructor(
    private readonly world: WorldImplementation<Schema>,
    included: readonly ErasedComponentToken[] = [],
  ) {
    this.included = included;
  }

  with<Added extends readonly SchemaToken<Schema>[]>(...components: Added): Query<Schema, [...Included, ...Added]> {
    return new QueryImplementation<Schema, [...Included, ...Added]>(this.world, [...this.included, ...components]);
  }

  without(...components: readonly SchemaToken<Schema>[]): Query<Schema, Included> {
    const query = new QueryImplementation<Schema, Included>(this.world, this.included);
    query.excluded.push(...components);
    return query;
  }

  each(callback: MatchCallback<Schema, Included[number]>): void {
    this.world.begin_iteration();
    try {
      for (const entity of this.world.matching_entities(this.included, this.excluded)) {
        callback(this.match(entity));
      }
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
      const values = new Map<symbol, ComponentValue>();
      for (const component of this.included) {
        const storage = component.get_storage(this.world.storage_key());
        const value = storage.get(match.entity);
        if (value === undefined) throw new Error(`ECS query lost component "${component.name}" during snapshotting`);
        values.set(component.component_id, storage.clone(value));
      }
      snapshots.push({
        entity: match.entity,
        read: <Requested extends Included[number]>(component: Requested) => {
          const value = values.get(component.component_id);
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

export function create_world<Schema extends ComponentSchema>(schema: Schema): World<Schema> {
  return new WorldImplementation(schema);
}
