<script lang="ts" generics="State, Commands extends Record<string, (...args: never[]) => unknown>">
  import type { Snippet } from "svelte";
  import type { AssetManifest } from "../core/runtime/asset_loading.js";
  import type { GameAdapter, GameAdapterOptions, GameAdapterView } from "./adapter.js";
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
    commands: {} as GameAdapterView<State, Commands>["commands"],
  });
  let view = $state<GameAdapterView<State, Commands>>();
  let adapter = $state<GameAdapter<State, Commands>>();

  $effect(() => {
    if (canvas === undefined) return;
    const next_adapter = create_game_adapter({ initial_state, commands, create });
    adapter = next_adapter;
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
