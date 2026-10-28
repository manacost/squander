<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import type { Game } from "../../../../../lib/core/runtime/game.js";

  type State = Readonly<{ score: number }>;
  let left_publish: ((state: State) => void) | undefined;
  let right_publish: ((state: State) => void) | undefined;
  const commands = {
    increment: (amount: number) => {
      const next_score = (current_score += amount);
      left_publish?.({ score: next_score });
      return next_score;
    },
  };
  const right_commands = {
    increment: (amount: number) => {
      const next_score = (right_score += amount);
      right_publish?.({ score: next_score });
      return next_score;
    },
  };
  let current_score = 0;
  let right_score = 10;
  const create_game_instance = (publish: (state: State) => void, on_dispose: () => void): Game =>
    ({
      ready: Promise.resolve(),
      renderer: {},
      resources: {},
      geometry: {},
      assets: {},
      resize: () => undefined,
      get_viewport: () => ({
        logical_width: 1,
        logical_height: 1,
        css_width: 1,
        css_height: 1,
        physical_width: 1,
        physical_height: 1,
        content_width: 1,
        content_height: 1,
        offset_x: 0,
        offset_y: 0,
      }),
      pause: () => undefined,
      resume: () => undefined,
      set_visibility: () => undefined,
      dispose: async () => on_dispose(),
      get_state: () => "running",
    }) as unknown as Game;
  const create = ({ publish }: { publish: (state: State) => void; canvas: HTMLCanvasElement; bridge: unknown }): Game => {
    left_publish = publish;
    publish({ score: current_score });
    return create_game_instance(publish, () => {
      left_publish = undefined;
    });
  };
  const create_right = ({ publish }: { publish: (state: State) => void; canvas: HTMLCanvasElement; bridge: unknown }): Game => {
    right_publish = publish;
    publish({ score: right_score });
    return create_game_instance(publish, () => {
      right_publish = undefined;
    });
  };
</script>

<svelte:head><title>Svelte 5 adapter</title></svelte:head>

<GameHost initial_state={{ score: 0 }} {commands} {create}>
  {#snippet children(view)}
    <output data-testid="adapter-status">{view.status}</output>
    <output data-testid="adapter-score">{view.state.score}</output>
    <button data-testid="adapter-increment" onclick={() => view.commands.increment(2)}>Increment</button>
  {/snippet}
</GameHost>

<GameHost initial_state={{ score: 10 }} commands={right_commands} create={create_right}>
  {#snippet children(view)}
    <output data-testid="adapter-right-status">{view.status}</output>
    <output data-testid="adapter-right-score">{view.state.score}</output>
    <button data-testid="adapter-right-increment" onclick={() => view.commands.increment(3)}>Increment</button>
  {/snippet}
</GameHost>
