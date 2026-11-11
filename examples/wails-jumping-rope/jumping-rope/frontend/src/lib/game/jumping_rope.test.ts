import { describe, expect, it } from "vitest";
import { create_jumping_rope_game } from "./jumping_rope.js";

const advance = (game: ReturnType<typeof create_jumping_rope_game>, centiseconds: number): void => {
  for (let index = 0; index < centiseconds; index += 1) game.update(0.01);
};

describe("jumping rope game", () => {
  it("starts ready and accepts a jump only after starting", () => {
    const game = create_jumping_rope_game();

    expect(game.get_state().status).toBe("ready");
    expect(game.jump()).toBe(false);
    expect(game.start()).toBe(true);
    expect(game.jump()).toBe(true);
    expect(game.get_state()).toMatchObject({ score: 1, last_points: 1, last_result: "jump", can_jump: false });
  });

  it("awards six points for the exact center of the target window", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();
    advance(game, 60);

    expect(game.get_state().rope_phase).toBeCloseTo(0.95);
    expect(game.jump()).toBe(true);
    expect(game.get_state()).toMatchObject({ status: "playing", score: 6, last_points: 6, last_result: "perfect" });
  });

  it("awards three points when the jump is one percent off center", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();
    advance(game, 59);

    expect(game.get_state().rope_phase).toBeCloseTo(0.94);
    expect(game.jump()).toBe(true);
    expect(game.get_state()).toMatchObject({ score: 3, last_points: 3, last_result: "close" });
  });

  it("awards one point for a jump outside the target window", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();
    advance(game, 55);

    expect(game.get_state().rope_phase).toBeCloseTo(0.9);
    expect(game.jump()).toBe(true);
    expect(game.get_state()).toMatchObject({ score: 1, last_points: 1, last_result: "jump" });
  });

  it("shifts the target and speeds up after every three jumps", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      advance(game, attempt === 0 ? 60 : 90);
      expect(game.jump()).toBe(true);
      if (attempt < 2) advance(game, 10);
    }

    expect(game.get_state()).toMatchObject({ attempts: 3, target_window_start: 0.96, speed_level: 1, rope_speed: 1.08 });
  });

  it("ends the run when a cycle passes without a jump", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();
    advance(game, 65);

    expect(game.get_state()).toMatchObject({ status: "game-over", score: 0, streak: 0 });
  });

  it("resets the run without losing the best score", () => {
    const game = create_jumping_rope_game({ rope_speed: 1 });
    game.start();
    advance(game, 60);
    game.jump();
    game.reset();

    expect(game.get_state()).toMatchObject({
      status: "ready",
      score: 0,
      best_score: 6,
      attempts: 0,
      target_window_start: 0.94,
      speed_level: 0,
      rope_speed: 1,
      last_points: 0,
    });
  });
});
