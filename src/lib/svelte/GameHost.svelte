<script lang="ts" generics="State, Commands extends Record<string, (...args: never[]) => unknown>">
  import type { Snippet } from "svelte";
  import type { AssetManifest } from "../core/runtime/asset_loading.js";
  import type { GameAdapterOptions, GameAdapterView } from "./adapter.js";
  import { create_game_adapter } from "./adapter.js";

  type Props<Manifest extends AssetManifest> = GameAdapterOptions<State, Commands, Manifest> & {
    children?: Snippet<[GameAdapterView<State, Commands>]>;
    class?: string;
  };

  let { initial_state, commands, create, children, class: class_name }: Props<AssetManifest> = $props();
  let canvas = $state<HTMLCanvasElement>();
  const get_initial_view = (): GameAdapterView<State, Commands> => ({
    state: initial_state,
    status: "loading",
    error: undefined,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Svelte's generic component checker cannot infer the empty command map.
    commands: {} as unknown as GameAdapterView<State, Commands>["commands"],
  });
  let view = $state<GameAdapterView<State, Commands>>();

  $effect(() => {
    if (canvas === undefined) return;
    const next_adapter = create_game_adapter({ initial_state, commands, create });
    const unsubscribe = next_adapter.subscribe((next_view) => {
      view = next_view;
    });
    void next_adapter.mount(canvas).catch(() => undefined);
    return () => {
      unsubscribe();
      void next_adapter.dispose();
    };
  });
</script>

<canvas bind:this={canvas} class={class_name}></canvas>
{#if children}
  {@render children(view ?? get_initial_view())}
{/if}
