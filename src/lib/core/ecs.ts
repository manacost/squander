import type { Milliseconds, Seconds } from "./common.js";

export type GameTimeComponent = ComponentDefinition<{
  type: "gametime";
  update: (elapsedTime: Seconds, dt: Milliseconds) => void;
}>;

export type ComponentMap = {
  gametime: GameTimeComponent;
};

export type ComponentDefinition<T> = T extends { type: keyof ComponentMap } ? T : never;
export type Entity = unknown;

export type ComponentType = ComponentMap[keyof ComponentMap];

export type ComponentRecord = Identity & Partial<ComponentMap>;

export type QueriedComponentRecord<TComponentKeys extends keyof ComponentRecord> = Required<Pick<ComponentRecord, TComponentKeys>> &
  Identity;

export type Component = keyof ComponentRecord;
export type Identity = {
  entity: Entity;
};

/**
 * Handles functionality for managing Entities, and their features
 */
export type EntityComponentManager = {
  /**
   * Creates a new Entity and registers it.
   */
  create: () => Entity;

  /**
   * Unregisters an entity and it's components
   */
  delete: (entity: Entity) => void;

  /**
   * Unregisters all entity and components
   */
  clear: () => void;

  /**
   * Adds a component to an entity
   */
  addComponent: (entity: Entity, component: ComponentType) => void;

  /**
   * Removes a component from an entity
   */
  removeComponent: (entity: Entity, component: Component) => void;

  /**
   * Finds Entities that have the parameter Component types
   */
  query: <T extends Component>(...components: T[]) => QueriedComponentRecord<T>[];

  /**
   * Retrieve the Components assocaited to an Entity
   */
  get: (entity: Entity) => ComponentRecord;
  /**
   * Similar to "get", but asserts the entity has specific components
   */
  tap: (entity: Entity) => ComponentRecord;
};

const map = new Map<Entity, ComponentRecord>();
let id = 0;

const ecs_manager: EntityComponentManager = {
  create: function (): Entity {
    const entity: Entity = ++id;
    map.set(entity, {
      entity,
      // draw: undefined,
      gametime: undefined,
      // position: undefined,
      // shoot: undefined,
      // velocity: undefined,
      // collider: undefined,
    });
    return entity;
  },

  delete: function (entity: Entity): void {
    map.delete(entity);
  },

  clear: function (): void {
    map.clear();
  },

  addComponent: function (entity: Entity, component: ComponentType): void {
    const record: ComponentRecord | undefined = map.get(entity);

    // @ts-expect-error ComponentMap is intentionally open to future component keys.
    record[component.type] = component;

    // if (component.type === "position") {
    //   record.position = component;
    // } else if (component.type === "velocity") {
    //   record.velocity = component;
    // } else if (component.type === "draw") {
    //   record.draw = component;
    // } else if (component.type === "gametime") {
    //   record.gametime = component;
    // } else if (component.type === "shoot") {
    //   record.shoot = component;
    // } else if (component.type === "collider") {
    //   record.collider = component;
    // } else {
    //   const _exhausted: never = component;
    // }
  },
  removeComponent: function (entity: Entity, ...components: Component[]): void {
    const record = ecs_manager.get(entity);
    components.forEach((component) => {
      record[component] = undefined;
    });
  },

  query: <T extends keyof ComponentRecord>(...components: T[]): QueriedComponentRecord<T>[] => {
    return Array.from(map.values()).filter((item): item is QueriedComponentRecord<T> => {
      return components.every((component) => item[component] !== undefined);
    });
  },
  get: (entity: Entity) => {
    const result = map.get(entity);
    // todo: assert
    if (result === undefined) {
      throw new Error();
    }
    return result;
  },

  tap: (entity: Entity) => {
    const result = map.get(entity);
    if (result === undefined) throw new Error();
    return result;
  },
};

/**
 * Retrieves the ECS singleton
 */
export const entity_component_system: () => EntityComponentManager = () => {
  return ecs_manager;
};
