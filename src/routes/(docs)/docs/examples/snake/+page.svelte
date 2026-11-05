<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import {
    create_browser_input_adapter,
    create_game,
    rgba,
    type InputDisposition,
    type InputEvent,
    type RenderCommand,
    type RuntimeGame,
    type WebGpuRenderer,
  } from "../../../../../lib/core/index.js";
  import type { GameAdapterView } from "../../../../../lib/svelte/adapter.js";
  import { create_snake_game, type Direction, type SnakeGame, type SnakeState } from "./snake.js";

  type SnakeCommands = Readonly<{
    start: () => void;
    toggle_pause: () => void;
    restart: () => void;
    set_direction: (direction: Direction) => void;
  }>;

  const board_size = 750;
  const cell_size = 15;
  const initial_state = create_snake_game({ random: () => 0, initial_fruit: { x: 0, y: 0 } }).get_state();
  const key_directions: Readonly<Record<string, Direction | undefined>> = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowRight: "right",
    KeyD: "right",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
  };

  let active_snake: SnakeGame | undefined;
  let publish_state: ((state: SnakeState) => void) | undefined;
  let active_renderer: WebGpuRenderer | undefined;

  const publish_current_state = (): void => {
    const state = active_snake?.get_state();
    if (state !== undefined) publish_state?.(state);
  };

  const commands: SnakeCommands = {
    start: () => {
      if (active_snake?.start()) publish_current_state();
    },
    toggle_pause: () => {
      if (active_snake?.toggle_pause()) publish_current_state();
    },
    restart: () => {
      if (active_snake?.restart()) publish_current_state();
    },
    set_direction: (direction) => {
      if (active_snake?.set_direction(direction)) publish_current_state();
    },
  };

  const handle_input = (event: InputEvent): InputDisposition => {
    if (event.type !== "key" || event.phase !== "down" || event.repeat) return "pass";
    const direction = key_directions[event.code];
    if (direction !== undefined) {
      commands.set_direction(direction);
      return "consume_and_prevent_default";
    }
    if (event.code === "Space" || event.code === "Enter") {
      const state = active_snake?.get_state();
      if (state?.status === "start") commands.start();
      else if (state?.status === "game-over") commands.restart();
      return "consume_and_prevent_default";
    }
    if (event.code === "Escape" || event.code === "KeyP") {
      commands.toggle_pause();
      return "consume_and_prevent_default";
    }
    return "pass";
  };

  const create_draw_commands = (state: SnakeState): RenderCommand[] => {
    const draw_commands: RenderCommand[] = [
      {
        kind: "rectangle",
        draw: { rectangle: { x: 0, y: 0, width: board_size, height: board_size }, color: rgba(0.02, 0.027, 0.051, 1) },
      },
      {
        kind: "rectangle_outline",
        draw: {
          rectangle: { x: 1, y: 1, width: board_size - 2, height: board_size - 2 },
          color: rgba(0.22, 0.26, 0.36, 1),
          stroke_width: 2,
        },
      },
    ];

    state.snake.forEach((segment, index) => {
      const inset = index === 0 ? 1.5 : 2.25;
      draw_commands.push({
        kind: "rectangle",
        draw: {
          rectangle: {
            x: segment.x * cell_size + inset,
            y: segment.y * cell_size + inset,
            width: cell_size - inset * 2,
            height: cell_size - inset * 2,
          },
          color: index === 0 ? rgba(0.96, 0.94, 0.88, 1) : rgba(0.38, 0.48, 0.72, 1),
        },
      });
    });

    if (state.fruit !== null) {
      draw_commands.push({
        kind: "circle",
        draw: {
          circle: { x: state.fruit.x * cell_size + cell_size / 2, y: state.fruit.y * cell_size + cell_size / 2, radius: 5 },
          color: state.fruit_color,
        },
      });
      draw_commands.push({
        kind: "circle_outline",
        draw: {
          circle: { x: state.fruit.x * cell_size + cell_size / 2, y: state.fruit.y * cell_size + cell_size / 2, radius: 6 },
          color: rgba(0.96, 0.94, 0.88, 0.85),
          stroke_width: 1,
        },
      });
    }
    return draw_commands;
  };

  const create_snake = ({ canvas, publish }: { canvas: HTMLCanvasElement; publish: (state: SnakeState) => void }): RuntimeGame => {
    publish_state = publish;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Snake game board");
    const snake = create_snake_game({ random: Math.random });
    active_snake = snake;
    const game = create_game({
      renderer: { canvas, width: board_size, height: board_size },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          cancelAnimationFrame(Number(handle));
        },
        now_seconds: () => performance.now() / 1000,
      },
      setup: ({ input, renderer, signal }) => {
        active_renderer = renderer;
        const remove_input = input.on_global(handle_input);
        const browser_input = create_browser_input_adapter({ host: canvas, router: input, focus_on_pointer_down: true });
        signal.addEventListener(
          "abort",
          () => {
            remove_input();
            browser_input.dispose();
          },
          { once: true },
        );
        publish_current_state();
      },
      update: (time) => {
        snake.update(time.delta_seconds);
        publish_state?.(snake.get_state());
      },
      draw: () => {
        const renderer = active_renderer;
        if (renderer === undefined) return;
        renderer
          .draw_commands(create_draw_commands(snake.get_state()))
          .then((pixels) => {
            Object.assign(globalThis, { __snake_readback: pixels });
          })
          .catch(() => undefined);
      },
    });
    return game;
  };
</script>

<svelte:head><title>Snake · Squander examples</title></svelte:head>

<article class="snake-page">
  <h1>Snake</h1>
  <p class="summary">
    A complete arcade loop on a 50×50 WebGPU board. The simulation owns movement and collisions; Svelte owns the menus, score, and touch
    controls.
  </p>

  <div class="snake-stage">
    <GameHost class="snake-canvas" {initial_state} {commands} create={create_snake}>
      {#snippet children(view: GameAdapterView<SnakeState, typeof commands>)}
        <div class="snake-hud" data-testid="snake-ui" aria-live="polite">
          <div class="snake-scorebar">
            <span>score <output data-testid="snake-score">{view.state.score}</output></span>
            <span>direction <output data-testid="snake-direction">{view.state.direction}</output></span>
            <span class="snake-state" data-testid="snake-status">{view.state.status}</span>
            {#if view.state.status === "playing" || view.state.status === "paused"}
              <button
                type="button"
                data-testid="snake-pause"
                onclick={() => {
                  view.commands.toggle_pause();
                }}
              >
                {view.state.status === "paused" ? "Resume" : "Pause"}
              </button>
            {/if}
          </div>

          {#if view.state.status === "start"}
            <section class="snake-menu" data-testid="snake-start-menu">
              <p class="menu-label">Arcade classic</p>
              <h2>Snake</h2>
              <p>Eat the fruit. Keep moving. Don’t hit the wall or yourself.</p>
              <button
                type="button"
                data-testid="snake-start"
                onclick={() => {
                  view.commands.start();
                }}>Start game</button
              >
              <p class="menu-hint">Use arrows or WASD · Enter to start</p>
            </section>
          {:else if view.state.status === "paused"}
            <section class="snake-menu" data-testid="snake-pause-menu">
              <p class="menu-label">Run paused</p>
              <h2>Take a breath</h2>
              <p>Your snake is waiting exactly where you left it.</p>
              <button
                type="button"
                data-testid="snake-resume"
                onclick={() => {
                  view.commands.toggle_pause();
                }}>Resume</button
              >
              <p class="menu-hint">Press P or Escape to resume</p>
            </section>
          {:else if view.state.status === "game-over"}
            <section class="snake-menu" data-testid="snake-game-over-menu">
              <p class="menu-label">Run complete</p>
              <h2>{view.state.game_over_reason === "cleared" ? "Board cleared" : "Game over"}</h2>
              <p>You scored {view.state.score} {view.state.score === 1 ? "fruit" : "fruits"}.</p>
              <button
                type="button"
                data-testid="snake-restart"
                onclick={() => {
                  view.commands.restart();
                }}>Play again</button
              >
              <p class="menu-hint">Press Enter or Space to restart</p>
            </section>
          {/if}

          <div class="snake-dpad" aria-label="Touch controls">
            <button
              type="button"
              data-testid="snake-touch-up"
              aria-label="Move up"
              disabled={view.state.status !== "playing"}
              onclick={() => {
                view.commands.set_direction("up");
              }}>Up</button
            >
            <button
              type="button"
              data-testid="snake-touch-left"
              aria-label="Move left"
              disabled={view.state.status !== "playing"}
              onclick={() => {
                view.commands.set_direction("left");
              }}>Left</button
            >
            <button
              type="button"
              data-testid="snake-touch-right"
              aria-label="Move right"
              disabled={view.state.status !== "playing"}
              onclick={() => {
                view.commands.set_direction("right");
              }}>Right</button
            >
            <button
              type="button"
              data-testid="snake-touch-down"
              aria-label="Move down"
              disabled={view.state.status !== "playing"}
              onclick={() => {
                view.commands.set_direction("down");
              }}>Down</button
            >
          </div>
        </div>
      {/snippet}
    </GameHost>
  </div>

  <h2>What this demonstrates</h2>
  <p>
    The example keeps gameplay in a small, deterministic state machine and uses the existing WebGPU shape commands for every board element.
    The typed <code>GameHost</code> bridge publishes readonly state to Svelte, while commands provide the narrow control surface for menus and
    touch input.
  </p>

  <h2>Public shape</h2>
  <pre><code
      >{[
        "type SnakeState = Readonly<{",
        '  status: "start" | "playing" | "paused" | "game-over";',
        "  snake: readonly GridPoint[];",
        "  fruit: GridPoint | null;",
        "  score: number;",
        "}>;",
        "",
        "<GameHost initial_state={initial_state} {commands} create={create_snake}>",
        "  {#snippet children(view)}",
        "    <output>{view.state.score}</output>",
        "  {/snippet}",
        "</GameHost>",
      ].join("\n")}</code
    ></pre>

  <h2>Scope and limitations</h2>
  <p>
    The board wraps no edges, the score lasts only for the current run, and the example supports keyboard and touch input. Rebinding,
    gamepad controls, persistent scores, audio, and network play remain outside this focused example.
  </p>
</article>

<style>
  .snake-page {
    max-width: 58rem;
  }

  .summary {
    max-width: 48rem;
    font-size: 1.2rem;
  }

  .snake-stage {
    position: relative;
    width: min(100%, 750px);
    margin: 2rem 0 2.5rem;
    background: #05070d;
  }

  :global(.snake-canvas) {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    background: #05070d;
    outline: 0;
  }

  :global(.snake-canvas:focus-visible) {
    outline: 2px solid #eef2fb;
    outline-offset: 4px;
  }

  .snake-hud {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1rem;
    pointer-events: none;
  }

  .snake-scorebar,
  .snake-menu,
  .snake-dpad {
    pointer-events: auto;
  }

  .snake-scorebar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: space-between;
    color: #eef2fb;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .snake-scorebar button,
  .snake-menu button,
  .snake-dpad button {
    border: 1px solid #6076a8;
    border-radius: 0;
    background: #39435b;
    color: #ffffff;
    font: inherit;
    cursor: pointer;
  }

  .snake-scorebar button,
  .snake-menu button {
    padding: 0.65rem 0.9rem;
  }

  .snake-scorebar button:hover,
  .snake-menu button:hover,
  .snake-dpad button:hover:not(:disabled) {
    background: #4a5a7b;
  }

  .snake-scorebar button:focus-visible,
  .snake-menu button:focus-visible,
  .snake-dpad button:focus-visible {
    outline: 2px solid #eef2fb;
    outline-offset: 3px;
  }

  .snake-scorebar button:disabled,
  .snake-dpad button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .snake-state {
    margin-left: auto;
    color: #b8c5e4;
  }

  .snake-menu {
    align-self: center;
    width: min(22rem, calc(100% - 2rem));
    padding: 1.5rem;
    border-top: 1px solid #39435b;
    border-bottom: 1px solid #39435b;
    background: rgba(21, 25, 35, 0.96);
    color: #eef2fb;
    text-align: center;
  }

  .snake-menu h2 {
    margin: 0.25rem 0 0.75rem;
    color: #ffffff;
    font-family: Geo, sans-serif;
    font-size: 2.2rem;
    font-weight: 400;
  }

  .snake-menu p {
    margin: 0 0 1rem;
  }

  .snake-menu .menu-label,
  .snake-menu .menu-hint {
    color: #b8c5e4;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .snake-menu .menu-hint {
    margin: 1rem 0 0;
    font-size: 0.7rem;
  }

  .snake-dpad {
    display: grid;
    grid-template-columns: repeat(3, 4.4rem);
    grid-template-rows: repeat(3, 2.6rem);
    gap: 0.35rem;
    align-self: center;
    justify-items: stretch;
  }

  .snake-dpad button {
    padding: 0.25rem;
    font-size: 0.7rem;
  }

  .snake-dpad button:first-child {
    grid-column: 2;
  }

  .snake-dpad button:nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }

  .snake-dpad button:nth-child(3) {
    grid-column: 3;
    grid-row: 2;
  }

  .snake-dpad button:nth-child(4) {
    grid-column: 2;
    grid-row: 3;
  }

  @media (max-width: 560px) {
    .snake-hud {
      padding: 0.65rem;
    }

    .snake-menu {
      padding: 1rem;
    }

    .snake-menu h2 {
      font-size: 1.8rem;
    }

    .snake-dpad {
      transform: scale(0.86);
      transform-origin: bottom center;
    }
  }
</style>
