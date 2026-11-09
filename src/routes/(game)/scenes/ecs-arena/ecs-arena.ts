import { create_random, create_world, define_component, type Entity, type RandomSource, type World } from "../../../../lib/core/index.js";

export const arena_width = 800;
export const arena_height = 500;

export type ArenaPoint = Readonly<{ x: number; y: number }>;
export type ArenaMove = Readonly<{ x: number; y: number }>;
export type ArenaStatus = "playing" | "paused" | "game-over";

export type ArenaState = Readonly<{
  status: ArenaStatus;
  score: number;
  wave: number;
  lives: number;
  enemy_count: number;
  projectile_count: number;
  entity_count: number;
  time_seconds: number;
  last_event: string;
  system_order: readonly string[];
}>;

export type ArenaRenderState = Readonly<{
  player: ArenaPoint | undefined;
  drones: readonly ArenaPoint[];
  projectiles: readonly ArenaPoint[];
}>;

export type EcsArenaGameOptions = Readonly<{
  random?: RandomSource | (() => number);
  initial_enemies?: readonly ArenaPoint[];
  enemy_spawn_interval_seconds?: number;
}>;

export type EcsArenaGame = Readonly<{
  get_state: () => ArenaState;
  get_render_state: () => ArenaRenderState;
  set_move: (move: ArenaMove) => void;
  fire: () => void;
  toggle_pause: () => boolean;
  restart: () => void;
  update: (delta_seconds: number) => void;
}>;

type Position = { x: number; y: number };
type Velocity = { x: number; y: number };
type Collider = { radius: number };
type Health = { value: number };
type Lifetime = { remaining_seconds: number };
type Marker = { active: true };

const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });
const collider = define_component<Collider>({ name: "collider" });
const health = define_component<Health>({ name: "health" });
const lifetime = define_component<Lifetime>({ name: "lifetime" });
const player_marker = define_component<Marker>({ name: "player" });
const drone_marker = define_component<Marker>({ name: "drone" });
const projectile_marker = define_component<Marker>({ name: "projectile" });
const arena_schema = { position, velocity, collider, health, lifetime, player_marker, drone_marker, projectile_marker };

type ArenaWorld = World<typeof arena_schema>;
type ArenaRuntimeState = {
  player_entity: Entity | undefined;
  status: ArenaStatus;
  score: number;
  time_seconds: number;
  spawn_elapsed_seconds: number;
  fire_cooldown_seconds: number;
  fire_requested: boolean;
  move_input: ArenaMove;
  facing: ArenaMove;
  last_event: string;
};
type ArenaSystemContext = Readonly<{
  world: ArenaWorld;
  state: ArenaRuntimeState;
  spawn_interval_seconds: number;
  create_random_drone: () => void;
  create_projectile: () => void;
}>;
type ArenaUpdateSystem = Readonly<{ update: (delta_seconds: number) => void }>;
type ArenaSystemFactory = (context: ArenaSystemContext) => ArenaUpdateSystem;

const system_order = Object.freeze(["input", "spawn", "fire", "steering", "movement", "combat", "cleanup"]);
const player_speed = 230;
const drone_speed = 62;
const projectile_speed = 460;
const player_radius = 15;
const drone_radius = 14;
const projectile_radius = 5;
const projectile_lifetime_seconds = 1.8;
const default_spawn_interval_seconds = 1.25;
type RandomInput = RandomSource | (() => number);
type RandomAccess = Pick<RandomSource, "next_float" | "next_int">;

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const normalized_random = (random: RandomInput | RandomAccess): number => {
  const value = typeof random === "function" ? random() : random.next_float();
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999, Math.max(0, value));
};

const random_access = (random: RandomInput): RandomAccess => {
  if (typeof random !== "function") return random;
  return {
    next_float: () => normalized_random(random),
    next_int: (min_inclusive, max_exclusive) => min_inclusive + Math.floor(normalized_random(random) * (max_exclusive - min_inclusive)),
  };
};

const resolve_spawn_interval = (interval: number | undefined): number => {
  const resolved = interval ?? default_spawn_interval_seconds;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error("enemy_spawn_interval_seconds must be a finite number greater than zero");
  }
  return resolved;
};

const distance_squared = (first: ArenaPoint, second: ArenaPoint): number => {
  const delta_x = first.x - second.x;
  const delta_y = first.y - second.y;
  return delta_x * delta_x + delta_y * delta_y;
};

const normalize_move = (move: ArenaMove): ArenaMove => {
  const x = Number.isFinite(move.x) ? move.x : 0;
  const y = Number.isFinite(move.y) ? move.y : 0;
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

const create_input_system = (context: ArenaSystemContext) => ({
  update: (_delta_seconds: number): void => {
    const { state, world } = context;
    if (state.player_entity === undefined || !world.has(state.player_entity)) return;
    const normalized = normalize_move(state.move_input);
    if (normalized.x !== 0 || normalized.y !== 0) state.facing = normalized;
    const player_velocity = world.write(state.player_entity, velocity);
    player_velocity.x = normalized.x * player_speed;
    player_velocity.y = normalized.y * player_speed;
  },
});

const create_spawn_system = (context: ArenaSystemContext) => ({
  update: (delta_seconds: number): void => {
    const { state } = context;
    state.spawn_elapsed_seconds += delta_seconds;
    while (state.spawn_elapsed_seconds >= context.spawn_interval_seconds) {
      state.spawn_elapsed_seconds -= context.spawn_interval_seconds;
      context.create_random_drone();
      state.last_event = "A drone entered the arena";
    }
  },
});

const create_fire_system = (context: ArenaSystemContext) => ({
  update: (delta_seconds: number): void => {
    const { state } = context;
    state.fire_cooldown_seconds = Math.max(0, state.fire_cooldown_seconds - delta_seconds);
    if (!state.fire_requested || state.fire_cooldown_seconds > 0) return;
    context.create_projectile();
    state.fire_cooldown_seconds = 0.18;
    state.fire_requested = false;
    state.last_event = "Projectile spawned";
  },
});

const create_steering_system = (context: ArenaSystemContext) => ({
  update: (_delta_seconds: number): void => {
    const { state, world } = context;
    if (state.player_entity === undefined || !world.has(state.player_entity)) return;
    const player_position = world.read(state.player_entity, position);
    world
      .query()
      .with(position, velocity, drone_marker)
      .each(({ read, write }) => {
        const drone_position = read(position);
        const delta_x = player_position.x - drone_position.x;
        const delta_y = player_position.y - drone_position.y;
        const length = Math.hypot(delta_x, delta_y) || 1;
        const drone_velocity = write(velocity);
        drone_velocity.x = (delta_x / length) * drone_speed;
        drone_velocity.y = (delta_y / length) * drone_speed;
      });
  },
});

const create_movement_system = (context: ArenaSystemContext) => ({
  update: (delta_seconds: number): void => {
    const { state, world } = context;
    world
      .query()
      .with(position, velocity)
      .each(({ read, write }) => {
        const current_position = write(position);
        const current_velocity = read(velocity);
        current_position.x += current_velocity.x * delta_seconds;
        current_position.y += current_velocity.y * delta_seconds;
      });

    if (state.player_entity !== undefined && world.has(state.player_entity)) {
      const player_position = world.write(state.player_entity, position);
      player_position.x = clamp(player_position.x, player_radius, arena_width - player_radius);
      player_position.y = clamp(player_position.y, player_radius, arena_height - player_radius);
    }
  },
});

const create_combat_system = (context: ArenaSystemContext) => ({
  update: (_delta_seconds: number): void => {
    const { state, world } = context;
    if (state.player_entity === undefined || !world.has(state.player_entity)) return;
    const player_position = world.read(state.player_entity, position);
    const player_health = world.write(state.player_entity, health);
    const bullets = world.query().with(position, collider, projectile_marker).toSnapshots();
    const drones = world.query().with(position, collider, drone_marker).toSnapshots();
    const destroyed_bullets = new Set<Entity>();
    const destroyed_drones = new Set<Entity>();

    for (const bullet of bullets) {
      const bullet_position = bullet.read(position);
      const bullet_collider = bullet.read(collider);
      for (const drone of drones) {
        if (destroyed_drones.has(drone.entity)) continue;
        const drone_position = drone.read(position);
        const drone_collider = drone.read(collider);
        if (distance_squared(bullet_position, drone_position) > (bullet_collider.radius + drone_collider.radius) ** 2) continue;
        destroyed_bullets.add(bullet.entity);
        destroyed_drones.add(drone.entity);
        state.score += 1;
        state.last_event = "Drone destroyed";
        break;
      }
    }

    for (const drone of drones) {
      if (destroyed_drones.has(drone.entity)) continue;
      const drone_position = drone.read(position);
      const drone_collider = drone.read(collider);
      if (distance_squared(player_position, drone_position) > (player_radius + drone_collider.radius) ** 2) continue;
      destroyed_drones.add(drone.entity);
      player_health.value -= 1;
      if (player_health.value <= 0) {
        state.status = "game-over";
        state.move_input = { x: 0, y: 0 };
        state.last_event = "The core was breached";
      }
    }

    for (const entity of destroyed_bullets) world.destroy(entity);
    for (const entity of destroyed_drones) world.destroy(entity);
  },
});

const create_cleanup_system = (context: ArenaSystemContext) => ({
  update: (delta_seconds: number): void => {
    const { world } = context;
    world
      .query()
      .with(position, lifetime, projectile_marker)
      .each(({ read, write, destroy }) => {
        const current_position = read(position);
        const remaining = write(lifetime);
        remaining.remaining_seconds -= delta_seconds;
        if (
          remaining.remaining_seconds <= 0 ||
          current_position.x < -projectile_radius ||
          current_position.x > arena_width + projectile_radius ||
          current_position.y < -projectile_radius ||
          current_position.y > arena_height + projectile_radius
        ) {
          destroy();
        }
      });
  },
});

const system_factories = {
  input: create_input_system,
  spawn: create_spawn_system,
  fire: create_fire_system,
  steering: create_steering_system,
  movement: create_movement_system,
  combat: create_combat_system,
  cleanup: create_cleanup_system,
} satisfies Record<string, ArenaSystemFactory>;

export const create_ecs_arena_game = (options: EcsArenaGameOptions = {}): EcsArenaGame => {
  const random = random_access(options.random ?? create_random());
  const spawn_interval_seconds = resolve_spawn_interval(options.enemy_spawn_interval_seconds);
  const world = create_world(arena_schema);
  const state: ArenaRuntimeState = {
    player_entity: undefined,
    status: "playing",
    score: 0,
    time_seconds: 0,
    spawn_elapsed_seconds: 0,
    fire_cooldown_seconds: 0,
    fire_requested: false,
    move_input: { x: 0, y: 0 },
    facing: { x: 1, y: 0 },
    last_event: "World ready",
  };

  const create_player = (): void => {
    const entity = world.create();
    state.player_entity = entity;
    world.add(entity, position, { x: arena_width / 2, y: arena_height / 2 });
    world.add(entity, velocity, { x: 0, y: 0 });
    world.add(entity, collider, { radius: player_radius });
    world.add(entity, health, { value: 1 });
    world.add(entity, player_marker, { active: true });
  };

  const create_drone = (point: ArenaPoint): void => {
    const entity = world.create();
    world.add(entity, position, {
      x: clamp(point.x, drone_radius, arena_width - drone_radius),
      y: clamp(point.y, drone_radius, arena_height - drone_radius),
    });
    world.add(entity, velocity, { x: 0, y: 0 });
    world.add(entity, collider, { radius: drone_radius });
    world.add(entity, drone_marker, { active: true });
  };

  const create_random_drone = (): void => {
    const edge = random.next_int(0, 4);
    const along = normalized_random(random);
    if (edge === 0) create_drone({ x: along * arena_width, y: drone_radius });
    else if (edge === 1) create_drone({ x: arena_width - drone_radius, y: along * arena_height });
    else if (edge === 2) create_drone({ x: along * arena_width, y: arena_height - drone_radius });
    else create_drone({ x: drone_radius, y: along * arena_height });
  };

  const create_projectile = (): void => {
    if (state.player_entity === undefined || !world.has(state.player_entity)) return;
    const player_position = world.read(state.player_entity, position);
    const entity = world.create();
    world.add(entity, position, {
      x: player_position.x + state.facing.x * (player_radius + projectile_radius + 2),
      y: player_position.y + state.facing.y * (player_radius + projectile_radius + 2),
    });
    world.add(entity, velocity, { x: state.facing.x * projectile_speed, y: state.facing.y * projectile_speed });
    world.add(entity, collider, { radius: projectile_radius });
    world.add(entity, lifetime, { remaining_seconds: projectile_lifetime_seconds });
    world.add(entity, projectile_marker, { active: true });
  };

  const reset = (): void => {
    world.clear();
    state.player_entity = undefined;
    state.status = "playing";
    state.score = 0;
    state.time_seconds = 0;
    state.spawn_elapsed_seconds = 0;
    state.fire_cooldown_seconds = 0;
    state.fire_requested = false;
    state.move_input = { x: 0, y: 0 };
    state.facing = { x: 1, y: 0 };
    state.last_event = "New run";
    create_player();
    for (const enemy of options.initial_enemies ?? []) create_drone(enemy);
  };

  const get_state = (): ArenaState => {
    const enemy_count = world.query().with(drone_marker).toArray().length;
    const projectile_count = world.query().with(projectile_marker).toArray().length;
    const entity_count = world.query().with(position).toArray().length;
    const lives = state.player_entity === undefined || !world.has(state.player_entity) ? 0 : world.read(state.player_entity, health).value;
    return {
      status: state.status,
      score: state.score,
      wave: 1 + Math.floor(state.time_seconds / 10),
      lives,
      enemy_count,
      projectile_count,
      entity_count,
      time_seconds: state.time_seconds,
      last_event: state.last_event,
      system_order,
    };
  };

  const get_render_state = (): ArenaRenderState => {
    const player_matches = world.query().with(position, player_marker).toSnapshots();
    const drone_matches = world.query().with(position, drone_marker).toSnapshots();
    const projectile_matches = world.query().with(position, projectile_marker).toSnapshots();
    return {
      player: player_matches[0]?.read(position),
      drones: drone_matches.map((match) => match.read(position)),
      projectiles: projectile_matches.map((match) => match.read(position)),
    };
  };

  const system_context: ArenaSystemContext = {
    world,
    state,
    spawn_interval_seconds,
    create_random_drone,
    create_projectile,
  };
  const systems = {
    input: system_factories.input(system_context),
    spawn: system_factories.spawn(system_context),
    fire: system_factories.fire(system_context),
    steering: system_factories.steering(system_context),
    movement: system_factories.movement(system_context),
    combat: system_factories.combat(system_context),
    cleanup: system_factories.cleanup(system_context),
  };

  const update = (delta_seconds: number): void => {
    if (state.status !== "playing") return;
    const safe_delta = clamp(delta_seconds, 0, 0.05);
    state.time_seconds += safe_delta;
    systems.input.update(safe_delta);
    systems.spawn.update(safe_delta);
    systems.fire.update(safe_delta);
    systems.steering.update(safe_delta);
    systems.movement.update(safe_delta);
    systems.combat.update(safe_delta);
    systems.cleanup.update(safe_delta);
  };

  reset();

  return Object.freeze({
    get_state,
    get_render_state,
    set_move: (move) => {
      state.move_input = normalize_move(move);
    },
    fire: () => {
      state.fire_requested = true;
    },
    toggle_pause: () => {
      if (state.status === "game-over") return false;
      state.status = state.status === "paused" ? "playing" : "paused";
      state.last_event = state.status === "paused" ? "Run paused" : "Run resumed";
      return true;
    },
    restart: reset,
    update,
  });
};
