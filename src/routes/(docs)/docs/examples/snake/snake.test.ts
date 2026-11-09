import { describe, expect, it } from "vitest";
import { create_random } from "../../../../../lib/core/index.js";
import {
  grid_size,
  initial_move_interval_ms,
  min_move_interval_ms,
  create_snake_game,
  is_readable_fruit_color,
  move_interval_ms_for_score,
  type GridPoint,
} from "./snake.js";

const fixed_random =
  (value: number): (() => number) =>
  () =>
    value;

const all_cells_except = (excluded: GridPoint): GridPoint[] => {
  const cells: GridPoint[] = [];
  for (let y = 0; y < grid_size; y += 1) {
    for (let x = 0; x < grid_size; x += 1) {
      if (x !== excluded.x || y !== excluded.y) cells.push({ x, y });
    }
  }
  return cells;
};

describe("snake simulation", () => {
  it("starts with a centered three-segment snake and a free fruit", () => {
    const game = create_snake_game({ random: fixed_random(0) });
    const state = game.get_state();

    expect(state.status).toBe("start");
    expect(state.snake).toEqual([
      { x: 25, y: 25 },
      { x: 24, y: 25 },
      { x: 23, y: 25 },
    ]);
    expect(state.fruit).not.toBeNull();
    expect(state.snake).not.toContainEqual(state.fruit);
    expect(state.move_interval_ms).toBe(initial_move_interval_ms);
  });

  it("reproduces the initial fruit and color from a seed", () => {
    const create_seeded_game = () => create_snake_game({ random: create_random({ seed: "snake-replay" }) });

    expect(create_seeded_game().get_state()).toEqual(create_seeded_game().get_state());
  });

  it("starts and moves on fixed simulation ticks", () => {
    const game = create_snake_game({ random: fixed_random(0), initial_fruit: { x: 0, y: 0 } });

    expect(game.start()).toBe(true);
    game.update(0.119);
    expect(game.get_state().snake[0]).toEqual({ x: 25, y: 25 });
    game.update(0.001);
    expect(game.get_state().snake[0]).toEqual({ x: 26, y: 25 });
  });

  it("accepts perpendicular turns and rejects rapid reversals", () => {
    const game = create_snake_game({ random: fixed_random(0), initial_fruit: { x: 0, y: 0 } });
    game.start();

    expect(game.set_direction("up")).toBe(true);
    expect(game.set_direction("down")).toBe(false);
    expect(game.set_direction("left")).toBe(false);
    game.update(0.12);
    expect(game.get_state().snake[0]).toEqual({ x: 25, y: 24 });
  });

  it("pauses simulation movement without losing the current run", () => {
    const game = create_snake_game({ random: fixed_random(0), initial_fruit: { x: 0, y: 0 } });
    game.start();
    expect(game.toggle_pause()).toBe(true);

    game.update(1);
    expect(game.get_state().status).toBe("paused");
    expect(game.get_state().snake[0]).toEqual({ x: 25, y: 25 });

    expect(game.toggle_pause()).toBe(true);
    game.update(0.12);
    expect(game.get_state().status).toBe("playing");
    expect(game.get_state().snake[0]).toEqual({ x: 26, y: 25 });
  });

  it("grows, scores, and respawns a readable fruit outside the snake", () => {
    const game = create_snake_game({
      random: fixed_random(0),
      initial_fruit: { x: 26, y: 25 },
    });
    game.start();
    game.update(0.12);

    const state = game.get_state();
    expect(state.score).toBe(1);
    expect(state.snake).toHaveLength(4);
    expect(state.fruit).not.toBeNull();
    expect(state.snake).not.toContainEqual(state.fruit);
    expect(is_readable_fruit_color(state.fruit_color)).toBe(true);
  });

  it("ends when the snake hits a wall or itself", () => {
    const wall_game = create_snake_game({
      random: fixed_random(0),
      initial_snake: [
        { x: 49, y: 25 },
        { x: 48, y: 25 },
        { x: 47, y: 25 },
      ],
      initial_fruit: { x: 0, y: 0 },
    });
    wall_game.start();
    wall_game.update(0.12);
    expect(wall_game.get_state().game_over_reason).toBe("wall");

    const self_game = create_snake_game({
      random: fixed_random(0),
      initial_snake: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
      ],
      initial_fruit: { x: 40, y: 40 },
    });
    self_game.start();
    self_game.set_direction("down");
    self_game.set_direction("left");
    self_game.update(0.12);
    expect(self_game.get_state().game_over_reason).toBe("self");
  });

  it("restarts a finished run immediately with a clean score", () => {
    const game = create_snake_game({
      random: fixed_random(0),
      initial_snake: [
        { x: 49, y: 25 },
        { x: 48, y: 25 },
        { x: 47, y: 25 },
      ],
      initial_fruit: { x: 0, y: 0 },
    });
    game.start();
    game.update(0.12);
    expect(game.get_state().status).toBe("game-over");

    expect(game.restart()).toBe(true);
    expect(game.get_state().status).toBe("playing");
    expect(game.get_state().score).toBe(0);
    expect(game.get_state().snake).toEqual([
      { x: 49, y: 25 },
      { x: 48, y: 25 },
      { x: 47, y: 25 },
    ]);
  });

  it("increases speed toward the minimum interval", () => {
    expect(move_interval_ms_for_score(0)).toBe(initial_move_interval_ms);
    expect(move_interval_ms_for_score(1)).toBe(initial_move_interval_ms - 4);
    expect(move_interval_ms_for_score(100)).toBe(min_move_interval_ms);
  });

  it("reports a cleared board when the final free cell is eaten", () => {
    const fruit = { x: 25, y: 25 };
    const snake = all_cells_except(fruit);
    const head_index = snake.findIndex((cell) => cell.x === 24 && cell.y === 25);
    const head = snake.splice(head_index, 1)[0];
    snake.unshift(head);
    const game = create_snake_game({
      random: fixed_random(0),
      initial_snake: snake,
      initial_direction: "right",
      initial_fruit: fruit,
    });

    game.start();
    game.update(0.12);

    const state = game.get_state();
    expect(state.status).toBe("game-over");
    expect(state.game_over_reason).toBe("cleared");
    expect(state.score).toBe(1);
    expect(state.fruit).toBeNull();
  });
});
