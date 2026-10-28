<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import type { Game } from "../../../../../lib/core/runtime/game.js";

  type State = Readonly<{ score: number }>;
  let publish_state: ((state: State) => void) | undefined;
  const commands = {
    increment: (amount: number) => {
      const next_score = (current_score += amount);
      publish_state?.({ score: next_score });
      return next_score;
    },
  };
  let current_score = 0;
  const create = ({ publish }: { publish: (state: State) => void; canvas: HTMLCanvasElement; bridge: unknown }): Game => {
    publish_state = publish;
    publish({ score: current_score });
    return {
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
      dispose: async () => {
        publish_state = undefined;
      },
      get_state: () => "running",
    } as unknown as Game;
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
