import { create_world, define_component, type Entity } from "../../../../lib/core/index.js";

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
  random?: () => number;
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

const system_order = Object.freeze(["input", "spawn", "fire", "steering", "movement", "combat", "cleanup"]);
const player_speed = 230;
const drone_speed = 62;
const projectile_speed = 460;
const player_radius = 15;
const drone_radius = 14;
const projectile_radius = 5;
const projectile_lifetime_seconds = 1.8;
const default_spawn_interval_seconds = 1.25;

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const normalized_random = (random: () => number): number => {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999, Math.max(0, value));
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

export const create_ecs_arena_game = (options: EcsArenaGameOptions = {}): EcsArenaGame => {
  const random = options.random ?? Math.random;
  const spawn_interval_seconds = resolve_spawn_interval(options.enemy_spawn_interval_seconds);
  const world = create_world({ position, velocity, collider, health, lifetime, player_marker, drone_marker, projectile_marker });
  let player_entity: Entity | undefined;
  let status: ArenaStatus = "playing";
  let score = 0;
  let time_seconds = 0;
  let spawn_elapsed_seconds = 0;
  let fire_cooldown_seconds = 0;
  let fire_requested = false;
  let move_input: ArenaMove = { x: 0, y: 0 };
  let facing: ArenaMove = { x: 1, y: 0 };
  let last_event = "World ready";

  const create_player = (): void => {
    const entity = world.create();
    player_entity = entity;
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
    const edge = Math.floor(normalized_random(random) * 4);
    const along = normalized_random(random);
    if (edge === 0) create_drone({ x: along * arena_width, y: drone_radius });
    else if (edge === 1) create_drone({ x: arena_width - drone_radius, y: along * arena_height });
    else if (edge === 2) create_drone({ x: along * arena_width, y: arena_height - drone_radius });
    else create_drone({ x: drone_radius, y: along * arena_height });
  };

  const create_projectile = (): void => {
    if (player_entity === undefined || !world.has(player_entity)) return;
    const player_position = world.read(player_entity, position);
    const entity = world.create();
    world.add(entity, position, {
      x: player_position.x + facing.x * (player_radius + projectile_radius + 2),
      y: player_position.y + facing.y * (player_radius + projectile_radius + 2),
    });
    world.add(entity, velocity, { x: facing.x * projectile_speed, y: facing.y * projectile_speed });
    world.add(entity, collider, { radius: projectile_radius });
    world.add(entity, lifetime, { remaining_seconds: projectile_lifetime_seconds });
    world.add(entity, projectile_marker, { active: true });
  };

  const reset = (): void => {
    world.clear();
    player_entity = undefined;
    status = "playing";
    score = 0;
    time_seconds = 0;
    spawn_elapsed_seconds = 0;
    fire_cooldown_seconds = 0;
    fire_requested = false;
    move_input = { x: 0, y: 0 };
    facing = { x: 1, y: 0 };
    last_event = "New run";
    create_player();
    for (const enemy of options.initial_enemies ?? []) create_drone(enemy);
  };

  const input_system = (): void => {
    if (player_entity === undefined || !world.has(player_entity)) return;
    const normalized = normalize_move(move_input);
    if (normalized.x !== 0 || normalized.y !== 0) facing = normalized;
    const player_velocity = world.write(player_entity, velocity);
    player_velocity.x = normalized.x * player_speed;
    player_velocity.y = normalized.y * player_speed;
  };

  const spawn_system = (delta_seconds: number): void => {
    spawn_elapsed_seconds += delta_seconds;
    while (spawn_elapsed_seconds >= spawn_interval_seconds) {
      spawn_elapsed_seconds -= spawn_interval_seconds;
      create_random_drone();
      last_event = "A drone entered the arena";
    }
  };

  const fire_system = (delta_seconds: number): void => {
    fire_cooldown_seconds = Math.max(0, fire_cooldown_seconds - delta_seconds);
    if (!fire_requested || fire_cooldown_seconds > 0) return;
    create_projectile();
    fire_cooldown_seconds = 0.18;
    fire_requested = false;
    last_event = "Projectile spawned";
  };

  const steering_system = (): void => {
    if (player_entity === undefined || !world.has(player_entity)) return;
    const player_position = world.read(player_entity, position);
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
  };

  const movement_system = (delta_seconds: number): void => {
    world
      .query()
      .with(position, velocity)
      .each(({ read, write }) => {
        const current_position = write(position);
        const current_velocity = read(velocity);
        current_position.x += current_velocity.x * delta_seconds;
        current_position.y += current_velocity.y * delta_seconds;
      });

    if (player_entity !== undefined && world.has(player_entity)) {
      const player_position = world.write(player_entity, position);
      player_position.x = clamp(player_position.x, player_radius, arena_width - player_radius);
      player_position.y = clamp(player_position.y, player_radius, arena_height - player_radius);
    }
  };

  const combat_system = (): void => {
    if (player_entity === undefined || !world.has(player_entity)) return;
    const player_position = world.read(player_entity, position);
    const player_health = world.write(player_entity, health);
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
        score += 1;
        last_event = "Drone destroyed";
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
        status = "game-over";
        move_input = { x: 0, y: 0 };
        last_event = "The core was breached";
      }
    }

    for (const entity of destroyed_bullets) world.destroy(entity);
    for (const entity of destroyed_drones) world.destroy(entity);
  };

  const cleanup_system = (delta_seconds: number): void => {
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
  };

  const get_state = (): ArenaState => {
    const enemy_count = world.query().with(drone_marker).toArray().length;
    const projectile_count = world.query().with(projectile_marker).toArray().length;
    const entity_count = world.query().with(position).toArray().length;
    const lives = player_entity === undefined || !world.has(player_entity) ? 0 : world.read(player_entity, health).value;
    return {
      status,
      score,
      wave: 1 + Math.floor(time_seconds / 10),
      lives,
      enemy_count,
      projectile_count,
      entity_count,
      time_seconds,
      last_event,
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

  const update = (delta_seconds: number): void => {
    if (status !== "playing") return;
    const safe_delta = clamp(delta_seconds, 0, 0.05);
    time_seconds += safe_delta;
    input_system();
    spawn_system(safe_delta);
    fire_system(safe_delta);
    steering_system();
    movement_system(safe_delta);
    combat_system();
    cleanup_system(safe_delta);
  };

  reset();

  return Object.freeze({
    get_state,
    get_render_state,
    set_move: (move) => {
      move_input = normalize_move(move);
    },
    fire: () => {
      fire_requested = true;
    },
    toggle_pause: () => {
      if (status === "game-over") return false;
      status = status === "paused" ? "playing" : "paused";
      last_event = status === "paused" ? "Run paused" : "Run resumed";
      return true;
    },
    restart: reset,
    update,
  });
};
