<script lang="ts">
  import {
    create_browser_input_adapter,
    create_game,
    type InputDisposition,
    type InputEvent,
    type RuntimeGame,
    type WebGpuRenderer,
  } from "squander";
  import { GameHost, type GameAdapterView } from "squander/svelte";
  import { create_draw_commands, create_jumping_rope_game, type JumpingRopeGame, type JumpingRopeState } from "../lib/game/jumping_rope.js";

  type JumpingRopeCommands = Readonly<{
    start: () => void;
    jump: () => void;
    reset: () => void;
  }>;

  const initial_state = create_jumping_rope_game().get_state();
  let active_game: JumpingRopeGame | undefined;
  let active_renderer: WebGpuRenderer | undefined;
  let publish_state: ((state: JumpingRopeState) => void) | undefined;
  let focus_game: (() => void) | undefined;

  const publish_current_state = (): void => {
    const state = active_game?.get_state();
    if (state !== undefined) publish_state?.(state);
  };

  const is_jump_window = (state: JumpingRopeState): boolean =>
    state.status === "playing" &&
    state.can_jump &&
    state.rope_phase >= state.target_window_start &&
    state.rope_phase <= state.target_window_start + state.target_window_width;

  const timing_copy = (state: JumpingRopeState): string => {
    if (state.status === "ready") return "PRESS SPACE TO START";
    if (state.status === "game-over") return "TRY THE NEXT SWEEP";
    if (is_jump_window(state)) return "PRESS SPACE NOW";
    if (!state.can_jump) return "NEXT SWEEP";
    if (state.rope_phase < state.target_window_start) return "HOLD FOR TARGET";
    return "NEXT SWEEP";
  };

  const target_window_copy = (state: JumpingRopeState): string =>
    `${Math.round(state.target_window_start * 100)}–${Math.round((state.target_window_start + state.target_window_width) * 100)}%`;

  const score_feedback = (state: JumpingRopeState): string => {
    if (state.last_points === 0) return "Center the gold window for +6.";
    if (state.last_result === "perfect") return `Last jump: +${state.last_points} perfect`;
    if (state.last_result === "close") return `Last jump: +${state.last_points} close`;
    return `Last jump: +${state.last_points} jump`;
  };

  const start_or_jump = (): void => {
    const game = active_game;
    if (game === undefined) return;
    const state = game.get_state();
    if (state.status === "ready") game.start();
    else if (state.status === "playing") game.jump();
    else {
      game.reset();
      game.start();
    }
    publish_current_state();
    focus_game?.();
  };

  const commands: JumpingRopeCommands = {
    start: start_or_jump,
    jump: start_or_jump,
    reset: () => {
      active_game?.reset();
      publish_current_state();
      focus_game?.();
    },
  };

  const create_jumping_rope = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    publish: (state: JumpingRopeState) => void;
  }): RuntimeGame => {
    const game = create_jumping_rope_game();
    active_game = game;
    publish_state = publish;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Jumping rope game board");

    const handle_input = (event: InputEvent): InputDisposition => {
      if (
        event.type === "key" &&
        event.phase === "down" &&
        (event.code === "Space" || event.code === "ArrowUp" || event.code === "Enter")
      ) {
        start_or_jump();
        return "consume_and_prevent_default";
      }
      if (event.type === "pointer" && event.phase === "down") {
        start_or_jump();
        return "consume";
      }
      return "pass";
    };

    const runtime_game = create_game({
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => cancelAnimationFrame(Number(handle)),
        now_seconds: () => performance.now() / 1000,
      },
      setup: ({ input, renderer, signal }) => {
        active_renderer = renderer;
        const remove_input = input.on_global(handle_input);
        const browser_input = create_browser_input_adapter({ host: canvas, router: input, focus_on_pointer_down: true });
        focus_game = browser_input.focus;
        signal.addEventListener(
          "abort",
          () => {
            remove_input();
            browser_input.dispose();
            active_game = undefined;
            active_renderer = undefined;
            focus_game = undefined;
          },
          { once: true },
        );
        publish_current_state();
      },
      update: ({ delta_seconds }) => {
        game.update(delta_seconds);
        publish_current_state();
      },
      draw: () => {
        const renderer = active_renderer;
        if (renderer === undefined) return;
        void renderer.draw_commands(create_draw_commands(game.get_state()));
      },
    });
    return runtime_game;
  };
</script>

<svelte:head>
  <title>Jump rope · Squander</title>
  <meta name="description" content="A tiny jumping-rope game built with SvelteKit, Wails, and Squander." />
</svelte:head>

<main class="game-page">
  <div class="game-shell">
    <header class="game-header">
      <div>
        <h1>Jump rope</h1>
        <p class="instruction">Watch the marker. Press Space when it enters the gold window.</p>
      </div>
      <div class="control-key">
        <span class="label">Primary control</span>
        <span class="keycap keycap-small">SPACE</span>
      </div>
    </header>

    <div class="game-host">
      <GameHost class="game-canvas" {initial_state} {commands} create={create_jumping_rope}>
        {#snippet children(view: GameAdapterView<JumpingRopeState, typeof commands>)}
          <div class="hud" data-testid="jumping-rope-hud">
            <div class="score-card">
              <span class="label">score</span>
              <strong data-testid="jumping-rope-score">{view.state.score}</strong>
            </div>
            <div class="score-card">
              <span class="label">best</span>
              <strong>{view.state.best_score}</strong>
            </div>
            <div class="score-card streak-card">
              <span class="label">streak</span>
              <strong>{view.state.streak}</strong>
            </div>
          </div>

          <div
            class:window-active={is_jump_window(view.state)}
            class="timing-panel"
            aria-live="polite"
            data-testid="jumping-rope-timing-rail"
          >
            <div class="timing-panel-header">
              <div>
                <span class="label">Timing rail</span>
                <strong>{timing_copy(view.state)}</strong>
              </div>
              <div class="timing-meta">
                <span class="timing-phase">{Math.round(view.state.rope_phase * 100)}%</span>
                <span class="timing-pace">PACE {view.state.speed_level + 1}</span>
              </div>
            </div>
            <div class="timing-track" aria-hidden="true">
              <span
                class="timing-zone"
                style={`--target-start: ${view.state.target_window_start * 100}%; --target-width: ${view.state.target_window_width * 100}%`}
              ></span>
              <span class="timing-marker" style={`--phase: ${view.state.rope_phase * 100}%`}></span>
            </div>
            <div class="timing-scale" aria-hidden="true">
              <span>EARLY</span>
              <span>PRESS SPACE</span>
              <span>ROPE LINE</span>
            </div>
            <p class="timing-instruction">
              {target_window_copy(view.state)} target · center +6 · 1% off +3 · any jump +1
            </p>
            <p class="timing-feedback">{score_feedback(view.state)}</p>
          </div>

          {#if view.state.status === "ready"}
            <section class="overlay" data-testid="jumping-rope-start">
              <h2>Press Space to start</h2>
              <p>Track the marker. Press Space inside the 2% gold window for the highest score.</p>
              <button type="button" onclick={view.commands.start}>
                <span class="keycap">SPACE</span>
                <span>Start run</span>
              </button>
            </section>
          {:else if view.state.status === "game-over"}
            <section class="overlay" data-testid="jumping-rope-game-over">
              <h2>Run ended</h2>
              <p>{view.state.score} points cleared. No jump landed before the rope line.</p>
              <button type="button" onclick={view.commands.reset}>
                <span class="keycap">SPACE</span>
                <span>Try again</span>
              </button>
            </section>
          {:else}
            <button class:window-active={is_jump_window(view.state)} class="jump-button" type="button" onclick={view.commands.jump}>
              <span class="keycap">SPACE</span>
              <span>{timing_copy(view.state)}</span>
            </button>
          {/if}
        {/snippet}
      </GameHost>
    </div>

    <footer class="game-footer">
      <span>Gold window shifts every three jumps. Speed increases every three attempts.</span>
      <button type="button" class="reset-button" onclick={commands.reset}>Reset run</button>
    </footer>
  </div>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: #05070d;
    color: #eef2fb;
    font-family: system-ui, sans-serif;
  }

  .game-page {
    min-height: 100vh;
    padding: clamp(1rem, 4vw, 3rem);
    background: #05070d;
  }

  .game-shell {
    width: min(100%, 72rem);
    margin: 0 auto;
  }

  .game-header,
  .game-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .game-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #39435b;
  }

  .label {
    margin: 0;
    color: #b8c6e2;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 0;
    color: #ffffff;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  h2 {
    margin-bottom: 0.75rem;
    color: #ffffff;
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    letter-spacing: -0.03em;
  }

  .instruction {
    max-width: 34rem;
    margin: 0.65rem 0 0;
    color: #b8c6e2;
    line-height: 1.45;
  }

  .control-key {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.game-host) {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid #39435b;
    background: #151923;
    outline: none;
  }

  :global(.game-host:focus-within) {
    border-color: #ffffff;
  }

  :global(.game-canvas) {
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
  }

  .hud {
    display: flex;
    position: absolute;
    top: 1rem;
    left: 1rem;
    gap: 0.5rem;
  }

  .score-card {
    display: grid;
    min-width: 4.75rem;
    gap: 0.15rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid #39435b;
    background: #151923;
  }

  .score-card strong {
    color: #ffffff;
    font-size: 1.5rem;
  }

  .streak-card .label {
    color: #69d5c8;
  }

  .timing-panel {
    position: absolute;
    top: 42%;
    left: 50%;
    width: min(76%, 54rem);
    padding: 1.25rem;
    border: 1px solid #39435b;
    background: #151923;
    transform: translate(-50%, -50%);
  }

  .timing-panel.window-active {
    border-color: #e1a94d;
  }

  .timing-panel-header,
  .timing-scale {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .timing-panel-header {
    align-items: start;
    margin-bottom: 0.9rem;
    color: #eef2fb;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .timing-panel-header strong {
    display: block;
    margin-top: 0.35rem;
    color: #e1a94d;
    font-size: clamp(1rem, 2vw, 1.35rem);
    letter-spacing: 0.02em;
  }

  .timing-phase {
    color: #eef2fb;
    font-size: 1.2rem;
    font-variant-numeric: tabular-nums;
  }

  .timing-meta {
    display: grid;
    gap: 0.25rem;
    justify-items: end;
    text-align: right;
  }

  .timing-pace {
    color: #8c9bbc;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
  }

  .timing-track {
    position: relative;
    height: clamp(2rem, 5vw, 3.5rem);
    border: 2px solid #6076a8;
    background: #05070d;
  }

  .timing-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--target-start);
    width: var(--target-width);
    min-width: 0.4rem;
    background: #e1a94d;
  }

  .timing-marker {
    position: absolute;
    top: -0.6rem;
    bottom: -0.6rem;
    left: var(--phase);
    width: 0.35rem;
    background: #ffffff;
    transform: translateX(-50%);
  }

  .timing-scale {
    margin-top: 0.55rem;
    color: #8c9bbc;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
  }

  .timing-scale span:nth-child(2) {
    color: #e1a94d;
  }

  .timing-instruction {
    margin: 1rem 0 0;
    color: #b8c6e2;
    font-size: 0.85rem;
  }

  .timing-feedback {
    margin: 0.45rem 0 0;
    color: #e1a94d;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .overlay {
    position: absolute;
    bottom: 1.25rem;
    left: 50%;
    width: min(80%, 24rem);
    padding: 1rem 1.25rem;
    border: 1px solid #6076a8;
    background: #151923;
    text-align: center;
    transform: translateX(-50%);
  }

  .overlay p:not(.eyebrow) {
    margin-bottom: 1rem;
    color: #b8c6e2;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  button {
    border: 0;
    background: #39435b;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }

  button:hover {
    background: #4a5a7b;
  }

  .overlay button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.75rem;
  }

  .jump-button {
    display: inline-flex;
    position: absolute;
    right: 50%;
    bottom: 1.25rem;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: #39435b;
    transform: translateX(50%);
  }

  .jump-button.window-active {
    background: #e1a94d;
    color: #151923;
  }

  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 4.25rem;
    min-height: 2.25rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid #6076a8;
    border-bottom-width: 3px;
    background: #eef2fb;
    color: #151923;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .keycap-small {
    min-width: 4rem;
    min-height: 1.9rem;
    font-size: 0.65rem;
  }

  button:focus-visible {
    outline: 2px solid #e1a94d;
    outline-offset: 3px;
  }

  .game-footer {
    margin-top: 0.85rem;
    color: #8c9bbc;
    font-size: 0.85rem;
  }

  .reset-button {
    padding: 0.4rem 0.75rem;
    border: 1px solid #39435b;
    background: transparent;
    color: #eef2fb;
    font-size: 0.8rem;
  }

  .reset-button:hover {
    background: #39435b;
  }

  @media (max-width: 38rem) {
    :global(.game-host) {
      aspect-ratio: 3 / 4;
    }

    .game-header,
    .game-footer {
      align-items: start;
      flex-direction: column;
    }

    .control-key {
      align-self: stretch;
      justify-content: space-between;
    }

    .timing-panel {
      top: 33%;
      right: 1rem;
      bottom: auto;
      left: 1rem;
      width: auto;
      transform: translateY(-50%);
    }

    .timing-track {
      height: 2.25rem;
    }

    .jump-button {
      right: 1rem;
      left: 1rem;
      justify-content: center;
      transform: none;
    }

    .overlay {
      width: calc(100% - 2rem);
      padding: 1rem;
    }
  }
</style>
