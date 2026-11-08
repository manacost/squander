import { describe, expect, it } from "vitest";
import { arena_height, arena_width, create_ecs_arena_game } from "./ecs-arena.js";

const advance = (game: ReturnType<typeof create_ecs_arena_game>, seconds: number): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
};

describe("ecs arena model", () => {
  it("creates a player and reports the caller-owned system order", () => {
    const game = create_ecs_arena_game({ initial_enemies: [] });

    expect(game.get_state()).toMatchObject({
      status: "playing",
      score: 0,
      enemy_count: 0,
      projectile_count: 0,
      entity_count: 1,
      system_order: ["input", "spawn", "fire", "steering", "movement", "combat", "cleanup"],
    });
    expect(game.get_render_state().player).toEqual({ x: arena_width / 2, y: arena_height / 2 });
  });

  it("moves the player through the movement query and clamps it to the arena", () => {
    const game = create_ecs_arena_game({ initial_enemies: [], enemy_spawn_interval_seconds: 100 });

    game.set_move({ x: 1, y: 0 });
    advance(game, 2);
    expect(game.get_render_state().player?.x).toBe(arena_width - 15);

    game.set_move({ x: 0, y: -1 });
    advance(game, 2);
    expect(game.get_render_state().player?.y).toBe(15);
  });

  it("spawns drones as structural ECS entities", () => {
    const game = create_ecs_arena_game({ random: () => 0, initial_enemies: [], enemy_spawn_interval_seconds: 0.2 });

    advance(game, 0.25);

    expect(game.get_state()).toMatchObject({ enemy_count: 1, entity_count: 2, last_event: "A drone entered the arena" });
  });

  it("destroys a drone with a projectile and increments the score", () => {
    const game = create_ecs_arena_game({
      initial_enemies: [{ x: arena_width / 2 + 90, y: arena_height / 2 }],
      enemy_spawn_interval_seconds: 100,
    });

    game.fire();
    advance(game, 0.3);

    expect(game.get_state()).toMatchObject({ score: 1, enemy_count: 0, projectile_count: 0, last_event: "Drone destroyed" });
  });

  it("enters game over when a drone reaches the player and can restart", () => {
    const game = create_ecs_arena_game({
      initial_enemies: [{ x: arena_width / 2 + 20, y: arena_height / 2 }],
      enemy_spawn_interval_seconds: 100,
    });

    advance(game, 0.2);
    expect(game.get_state()).toMatchObject({ status: "game-over", lives: 0, last_event: "The core was breached" });

    game.restart();
    expect(game.get_state()).toMatchObject({ status: "playing", score: 0, lives: 1, enemy_count: 1, entity_count: 2 });
  });

  it("pauses simulation time without losing ECS state", () => {
    const game = create_ecs_arena_game({ initial_enemies: [], enemy_spawn_interval_seconds: 0.2 });

    expect(game.toggle_pause()).toBe(true);
    advance(game, 1);
    expect(game.get_state()).toMatchObject({ status: "paused", time_seconds: 0, enemy_count: 0 });

    expect(game.toggle_pause()).toBe(true);
    advance(game, 0.25);
    expect(game.get_state()).toMatchObject({ status: "playing", time_seconds: 0.25, enemy_count: 1 });
  });
});
