<script lang="ts">
  import { resolve } from "$app/paths";
  import GameHost from "../../../../lib/svelte/GameHost.svelte";
  import {
    create_browser_input_adapter,
    create_game,
    rgba,
    type InputDisposition,
    type InputEvent,
    type RenderCommand,
    type RuntimeGame,
  } from "../../../../lib/core/index.js";
  import type { GameAdapterView } from "../../../../lib/svelte/adapter.js";
  import {
    arena_height,
    arena_width,
    create_ecs_arena_game,
    type ArenaMove,
    type ArenaRenderState,
    type ArenaState,
    type EcsArenaGame,
  } from "./ecs-arena.js";

  type ArenaCommands = Readonly<{
    toggle_pause: () => void;
    fire: () => void;
    restart: () => void;
  }>;

  const initial_state = create_ecs_arena_game({
    initial_enemies: [
      { x: 650, y: 250 },
      { x: 700, y: 410 },
    ],
  }).get_state();

  let active_arena: EcsArenaGame | undefined;
  let publish_state: ((state: ArenaState) => void) | undefined;
  let focus_game: (() => void) | undefined;

  const move_for_keys = (pressed: readonly string[]): ArenaMove => ({
    x:
      Number(pressed.includes("ArrowRight") || pressed.includes("KeyD")) -
      Number(pressed.includes("ArrowLeft") || pressed.includes("KeyA")),
    y: Number(pressed.includes("ArrowDown") || pressed.includes("KeyS")) - Number(pressed.includes("ArrowUp") || pressed.includes("KeyW")),
  });

  const create_draw_commands = (render_state: ArenaRenderState): RenderCommand[] => {
    const commands: RenderCommand[] = [
      {
        kind: "rectangle",
        draw: { rectangle: { x: 0, y: 0, width: arena_width, height: arena_height }, color: rgba(0.025, 0.035, 0.075, 1) },
      },
    ];

    for (let x = 40; x < arena_width; x += 40) {
      commands.push({
        kind: "line",
        draw: { line: { from: { x, y: 0 }, to: { x, y: arena_height } }, color: rgba(0.12, 0.18, 0.3, 0.34), stroke_width: 1 },
      });
    }
    for (let y = 40; y < arena_height; y += 40) {
      commands.push({
        kind: "line",
        draw: { line: { from: { x: 0, y }, to: { x: arena_width, y } }, color: rgba(0.12, 0.18, 0.3, 0.34), stroke_width: 1 },
      });
    }

    commands.push({
      kind: "rectangle_outline",
      draw: {
        rectangle: { x: 1, y: 1, width: arena_width - 2, height: arena_height - 2 },
        color: rgba(0.3, 0.55, 0.8, 0.85),
        stroke_width: 2,
      },
    });

    for (const projectile of render_state.projectiles) {
      commands.push({ kind: "circle", draw: { circle: { ...projectile, radius: 5 }, color: rgba(1, 0.85, 0.24, 1) } });
      commands.push({
        kind: "circle_outline",
        draw: { circle: { ...projectile, radius: 8 }, color: rgba(1, 0.95, 0.62, 0.7), stroke_width: 1 },
      });
    }

    for (const drone of render_state.drones) {
      commands.push({ kind: "circle", draw: { circle: { ...drone, radius: 14 }, color: rgba(0.95, 0.22, 0.38, 0.95) } });
      commands.push({
        kind: "circle_outline",
        draw: { circle: { ...drone, radius: 18 }, color: rgba(1, 0.55, 0.42, 0.75), stroke_width: 2 },
      });
    }

    if (render_state.player !== undefined) {
      commands.push({ kind: "circle", draw: { circle: { ...render_state.player, radius: 15 }, color: rgba(0.25, 0.85, 1, 1) } });
      commands.push({
        kind: "circle_outline",
        draw: { circle: { ...render_state.player, radius: 23 }, color: rgba(0.55, 0.95, 1, 0.85), stroke_width: 2 },
      });
    }

    return commands;
  };

  const publish_current_state = (): void => {
    if (active_arena !== undefined) publish_state?.(active_arena.get_state());
  };

  const commands: ArenaCommands = {
    toggle_pause: () => {
      active_arena?.toggle_pause();
      publish_current_state();
      focus_game?.();
    },
    fire: () => {
      active_arena?.fire();
      focus_game?.();
    },
    restart: () => {
      active_arena?.restart();
      publish_current_state();
      focus_game?.();
    },
  };

  const create_arena = ({ canvas, publish }: { canvas: HTMLCanvasElement; publish: (state: ArenaState) => void }): RuntimeGame => {
    const arena = create_ecs_arena_game({
      initial_enemies: [
        { x: 650, y: 250 },
        { x: 700, y: 410 },
      ],
    });
    let pressed: string[] = [];
    active_arena = arena;
    publish_state = publish;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "ECS Arena game board");

    const update_move = (): void => {
      arena.set_move(move_for_keys(pressed));
    };

    const handle_input = (event: InputEvent): InputDisposition => {
      if (event.type !== "key") return "pass";
      if (event.phase === "down") {
        if (!pressed.includes(event.code)) pressed = [...pressed, event.code];
        update_move();
        if (event.code === "Space") arena.fire();
        if (event.code === "KeyP" || event.code === "Escape") arena.toggle_pause();
        if (event.code === "KeyR" || (event.code === "Enter" && arena.get_state().status === "game-over")) arena.restart();
      } else {
        pressed = pressed.filter((code) => code !== event.code);
        update_move();
      }
      publish_state?.(arena.get_state());
      return "consume_and_prevent_default";
    };

    const game = create_game({
      renderer: { canvas, width: arena_width, height: arena_height },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          cancelAnimationFrame(Number(handle));
        },
        now_seconds: () => performance.now() / 1000,
      },
      setup: ({ input, signal }) => {
        const remove_input = input.on_global(handle_input);
        const browser_input = create_browser_input_adapter({ host: canvas, router: input, focus_on_pointer_down: true });
        focus_game = browser_input.focus;
        canvas.dataset.ecsRenderReady = "true";
        publish_state?.(arena.get_state());
        signal.addEventListener(
          "abort",
          () => {
            remove_input();
            browser_input.dispose();
            focus_game = undefined;
            active_arena = undefined;
            publish_state = undefined;
            delete canvas.dataset.ecsRenderReady;
          },
          { once: true },
        );
      },
      update: (time) => {
        arena.update(time.delta_seconds);
        publish_state?.(arena.get_state());
      },
      draw: () => {
        void game.renderer.draw_commands(create_draw_commands(arena.get_render_state())).catch(() => undefined);
      },
    });
    return game;
  };
</script>

<svelte:head><title>ECS Arena · Squander</title></svelte:head>

<main class="arena-page">
  <header class="arena-header">
    <div>
      <h1>ECS Arena</h1>
      <p>Move the core, fire at the drones, and watch the ECS create, query, move, and destroy entities in real time.</p>
    </div>
    <a href={resolve("/(docs)/docs/ecs")}>Read the ECS guide</a>
  </header>

  <section class="arena-shell" aria-label="ECS Arena">
    <GameHost class="arena-canvas" {initial_state} {commands} create={create_arena}>
      {#snippet children(view: GameAdapterView<ArenaState, typeof commands>)}
        <aside class="arena-hud" data-testid="ecs-arena-hud" aria-live="polite">
          <div class="hud-topline">
            <span>world telemetry</span>
            <span data-testid="ecs-arena-status" class:game-over={view.state.status === "game-over"}>{view.state.status}</span>
          </div>
          <div class="hud-stats">
            <span>score <strong data-testid="ecs-arena-score">{view.state.score}</strong></span>
            <span>wave <strong data-testid="ecs-arena-wave">{view.state.wave}</strong></span>
            <span>entities <strong data-testid="ecs-arena-entities">{view.state.entity_count}</strong></span>
            <span>shots <strong data-testid="ecs-arena-projectiles">{view.state.projectile_count}</strong></span>
          </div>
          <p class="hud-event" data-testid="ecs-arena-event">{view.state.last_event}</p>
          <p class="hud-systems">{view.state.system_order.join(" → ")}</p>
          {#if view.state.status === "game-over"}
            <div class="arena-overlay">
              <h2>Core breached</h2>
              <p>You cleared {view.state.score} drones.</p>
              <button type="button" data-testid="ecs-arena-restart" onclick={commands.restart}>Restart run</button>
            </div>
          {/if}
        </aside>
      {/snippet}
    </GameHost>
  </section>

  <footer class="arena-footer">
    <p>
      <strong>WASD / arrows</strong> move · <strong>Space</strong> fire · <strong>P / Escape</strong> pause · <strong>R</strong> restart
    </p>
    <button type="button" data-testid="ecs-arena-pause" onclick={commands.toggle_pause}>Pause / resume</button>
  </footer>
</main>

<style>
  .arena-page {
    color-scheme: dark;
    min-height: 100vh;
    padding: 2rem clamp(1rem, 4vw, 3rem);
    background: #232121;
    color: #e9f3ff;
    font-family: system-ui, sans-serif;
  }

  .arena-header,
  .arena-footer {
    width: min(100%, 960px);
    margin: 0 auto 1rem;
  }

  .arena-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #39435b;
  }

  .arena-header h1 {
    margin: 0;
    color: #ffffff;
    font-family: Geo, sans-serif;
    font-size: 2rem;
    font-weight: 400;
    line-height: 1.2;
  }

  .arena-header p {
    max-width: 38rem;
    margin: 0.5rem 0 0;
    color: #b7c9e2;
  }

  .arena-header a {
    color: var(--red-4);
    text-underline-offset: 0.2em;
  }

  .arena-header a:hover {
    color: #ffffff;
  }

  .arena-footer button,
  .arena-overlay button {
    border: 1px solid #4b7399;
    background: #39435b;
    color: #e9f3ff;
    cursor: pointer;
    padding: 0.7rem 0.9rem;
    text-decoration: none;
  }

  .arena-footer button:hover,
  .arena-overlay button:hover {
    background: #4a5a7b;
  }

  .arena-shell {
    position: relative;
    width: min(100%, 960px);
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid #294363;
    background: #05070d;
  }

  :global(.arena-canvas) {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 8 / 5;
    outline: none;
  }

  :global(.arena-canvas:focus-visible) {
    outline: 3px solid #85e8ff;
    outline-offset: -3px;
  }

  .arena-hud {
    position: absolute;
    inset: 0.75rem 0.75rem auto;
    pointer-events: none;
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid #39435b;
    background: #151923d9;
    color: #e9f3ff;
  }

  .hud-topline,
  .hud-stats {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .hud-topline {
    justify-content: space-between;
    color: #b7c9e2;
    font-size: 0.8rem;
  }

  .hud-topline .game-over {
    color: #ff7381;
  }

  .hud-stats {
    margin-top: 0.25rem;
    color: #bdd0e8;
    font-size: 0.85rem;
  }

  .hud-stats strong {
    color: #85e8ff;
  }

  .hud-event,
  .hud-systems {
    margin: 0.35rem 0 0;
    color: #b7c9e2;
    font-size: 0.72rem;
  }

  .hud-systems {
    color: #6f9fc5;
  }

  .arena-overlay {
    pointer-events: auto;
    width: min(22rem, 80vw);
    margin: 6rem auto 0;
    padding: 1.25rem;
    border: 1px solid #4b7399;
    background: #151923;
    text-align: center;
  }

  .arena-overlay h2 {
    margin: 0;
    color: #e9f3ff;
  }

  .arena-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #39435b;
    color: #b7c9e2;
    font-size: 0.85rem;
  }

  .arena-footer p {
    margin: 0;
  }

  .arena-footer strong {
    color: #ffffff;
  }

  @media (max-width: 720px) {
    .arena-page {
      padding: 1.5rem 0.75rem;
    }

    .arena-header,
    .arena-footer {
      display: block;
    }

    .arena-header a,
    .arena-footer button {
      display: inline-block;
      margin-top: 0.75rem;
    }
  }
</style>
