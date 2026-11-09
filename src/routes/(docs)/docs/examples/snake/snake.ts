import { create_random, hsl, type Color, type RandomSource } from "../../../../../lib/core/index.js";

export const grid_size = 50;
export const initial_move_interval_ms = 120;
export const min_move_interval_ms = 60;
export const move_interval_step_ms = 4;
export const min_fruit_luminance = 0.42;

export type GridPoint = Readonly<{ x: number; y: number }>;
export type Direction = "up" | "right" | "down" | "left";
export type SnakeStatus = "start" | "playing" | "paused" | "game-over";
export type GameOverReason = "wall" | "self" | "cleared";

export type SnakeState = Readonly<{
  status: SnakeStatus;
  snake: readonly GridPoint[];
  direction: Direction;
  queued_direction: Direction;
  fruit: GridPoint | null;
  fruit_color: Color;
  score: number;
  move_interval_ms: number;
  game_over_reason: GameOverReason | undefined;
}>;

export type SnakeGameOptions = Readonly<{
  random?: RandomSource | (() => number);
  initial_snake?: readonly GridPoint[];
  initial_direction?: Direction;
  initial_fruit?: GridPoint;
  initial_fruit_color?: Color;
}>;

export type SnakeGame = Readonly<{
  get_state: () => SnakeState;
  start: () => boolean;
  restart: () => boolean;
  toggle_pause: () => boolean;
  set_direction: (direction: Direction) => boolean;
  update: (delta_seconds: number) => void;
}>;

type MutableState = {
  status: SnakeStatus;
  snake: GridPoint[];
  direction: Direction;
  queued_direction: Direction;
  fruit: GridPoint | null;
  fruit_color: Color;
  score: number;
  move_interval_ms: number;
  game_over_reason: GameOverReason | undefined;
};

type RandomInput = RandomSource | (() => number);
type RandomAccess = Pick<RandomSource, "next_float" | "next_int">;

const default_snake: readonly GridPoint[] = [
  { x: 25, y: 25 },
  { x: 24, y: 25 },
  { x: 23, y: 25 },
];

const direction_delta: Readonly<Record<Direction, GridPoint>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const same_point = (first: GridPoint, second: GridPoint): boolean => first.x === second.x && first.y === second.y;

const copy_point = (point: GridPoint): GridPoint => Object.freeze({ x: point.x, y: point.y });

const copy_snake = (snake: readonly GridPoint[]): GridPoint[] => snake.map(copy_point);

const is_inside_grid = (point: GridPoint): boolean => point.x >= 0 && point.x < grid_size && point.y >= 0 && point.y < grid_size;

const is_opposite = (first: Direction, second: Direction): boolean => {
  return (
    (first === "up" && second === "down") ||
    (first === "right" && second === "left") ||
    (first === "down" && second === "up") ||
    (first === "left" && second === "right")
  );
};

const normalized_random = (random: RandomInput): number => {
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

const find_free_cell = (snake: readonly GridPoint[], random: RandomAccess): GridPoint | undefined => {
  const free_cells: GridPoint[] = [];
  for (let y = 0; y < grid_size; y += 1) {
    for (let x = 0; x < grid_size; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) free_cells.push({ x, y });
    }
  }
  if (free_cells.length === 0) return undefined;
  return free_cells[random.next_int(0, free_cells.length)];
};

export const color_luminance = (color: Color): number => 0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue;

export const is_readable_fruit_color = (color: Color): boolean => color_luminance(color) >= min_fruit_luminance;

const create_fruit_color = (random: RandomAccess): Color => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const color = hsl(random.next_float() * 360, 0.78, 0.66);
    if (is_readable_fruit_color(color)) return color;
  }
  return hsl(48, 0.8, 0.68);
};

export const move_interval_ms_for_score = (score: number): number =>
  Math.max(min_move_interval_ms, initial_move_interval_ms - Math.max(0, Math.floor(score)) * move_interval_step_ms);

const copy_state = (state: MutableState): SnakeState =>
  Object.freeze({
    status: state.status,
    snake: Object.freeze(state.snake.map(copy_point)),
    direction: state.direction,
    queued_direction: state.queued_direction,
    fruit: state.fruit === null ? null : copy_point(state.fruit),
    fruit_color: state.fruit_color,
    score: state.score,
    move_interval_ms: state.move_interval_ms,
    game_over_reason: state.game_over_reason,
  });

export const create_snake_game = (options: SnakeGameOptions = {}): SnakeGame => {
  const random = random_access(options.random ?? create_random());
  const initial_snake = options.initial_snake === undefined || options.initial_snake.length === 0 ? default_snake : options.initial_snake;
  const initial_direction = options.initial_direction ?? "right";
  let elapsed_since_move_seconds = 0;

  const create_run = (): MutableState => {
    const snake = copy_snake(initial_snake);
    const requested_fruit = options.initial_fruit === undefined ? undefined : copy_point(options.initial_fruit);
    const fruit =
      requested_fruit !== undefined && is_inside_grid(requested_fruit) && !snake.some((segment) => same_point(segment, requested_fruit))
        ? requested_fruit
        : (find_free_cell(snake, random) ?? null);
    return {
      status: "start",
      snake,
      direction: initial_direction,
      queued_direction: initial_direction,
      fruit,
      fruit_color: options.initial_fruit_color ?? create_fruit_color(random),
      score: 0,
      move_interval_ms: initial_move_interval_ms,
      game_over_reason: undefined,
    };
  };

  let state = create_run();

  const spawn_fruit = (): void => {
    const next_fruit = find_free_cell(state.snake, random);
    if (next_fruit === undefined) {
      state.fruit = null;
      state.status = "game-over";
      state.game_over_reason = "cleared";
      return;
    }
    state.fruit = next_fruit;
    state.fruit_color = create_fruit_color(random);
  };

  const step = (): void => {
    const delta = direction_delta[state.queued_direction];
    const next_head = { x: state.snake[0].x + delta.x, y: state.snake[0].y + delta.y };
    if (!is_inside_grid(next_head)) {
      state.status = "game-over";
      state.game_over_reason = "wall";
      return;
    }

    const will_grow = state.fruit !== null && same_point(next_head, state.fruit);
    const collision_body = will_grow ? state.snake : state.snake.slice(0, -1);
    if (collision_body.some((segment) => same_point(segment, next_head))) {
      state.status = "game-over";
      state.game_over_reason = "self";
      return;
    }

    state.direction = state.queued_direction;
    state.snake = will_grow ? [next_head, ...state.snake] : [next_head, ...state.snake.slice(0, -1)];
    if (will_grow) {
      state.score += 1;
      state.move_interval_ms = move_interval_ms_for_score(state.score);
      spawn_fruit();
    }
  };

  const is_playing = (): boolean => state.status === "playing";

  const get_state = (): SnakeState => copy_state(state);

  const start = (): boolean => {
    if (state.status !== "start") return false;
    state.status = "playing";
    elapsed_since_move_seconds = 0;
    return true;
  };

  const restart = (): boolean => {
    state = create_run();
    state.status = "playing";
    elapsed_since_move_seconds = 0;
    return true;
  };

  const toggle_pause = (): boolean => {
    if (state.status === "playing") {
      state.status = "paused";
      return true;
    }
    if (state.status === "paused") {
      state.status = "playing";
      elapsed_since_move_seconds = 0;
      return true;
    }
    return false;
  };

  const set_direction = (direction: Direction): boolean => {
    if (state.status !== "playing" || direction === state.direction || is_opposite(direction, state.direction)) return false;
    if (is_opposite(direction, state.queued_direction)) return false;
    state.queued_direction = direction;
    return true;
  };

  const update = (delta_seconds: number): void => {
    if (state.status !== "playing" || !Number.isFinite(delta_seconds) || delta_seconds <= 0) return;
    elapsed_since_move_seconds += delta_seconds;
    while (elapsed_since_move_seconds * 1000 >= state.move_interval_ms) {
      elapsed_since_move_seconds -= state.move_interval_ms / 1000;
      step();
      if (!is_playing()) break;
    }
  };

  return Object.freeze({ get_state, start, restart, toggle_pause, set_direction, update });
};
